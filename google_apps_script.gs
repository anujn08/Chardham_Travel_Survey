/*
 * Char Dham Survey v2 - Google Apps Script web app
 * Paste this complete file into Code.gs in the Apps Script project attached
 * to the fresh spreadsheet. Deploy as a Web app (execute as you; access: anyone).
 */

var RAW_SHEET = 'Sheet1';
var ORDERED_RAW_SHEET = 'RawOrdered';
var SPREADSHEET_ID = '12VtOBJ8uUp1hFmc1JyQbblZz9zOJAuyzddgfWpsOwYw';

function doGet() {
  return jsonOutput({ result: 'success', version: '2.2', spreadsheetId: SPREADSHEET_ID, message: 'Char Dham Survey v2 endpoint is working.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var params = (e && e.parameters) || {};
    var submittedAt = new Date();
    var responseId = makeResponseId(submittedAt);

    writeRaw(params, responseId, submittedAt);
    writeOrderedRaw(params, responseId, submittedAt);
    writeResponseFields(params, responseId);
    writeRespondent(params, responseId, submittedAt);
    writeDhamVisits(params, responseId);
    writeMainHaulSegments(params, responseId);
    writeMainHaulTransfers(params, responseId);
    writeInterDhamSegments(params, responseId);
    writeReturnSegments(params, responseId);
    writeStopovers(params, responseId);
    writeLastMileTrips(params, responseId);
    writeServiceEvaluations(params, responseId);
    writeChoiceResponses(params, responseId);

    return jsonOutput({ result: 'success', responseId: responseId });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput({ result: 'error', error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function makeResponseId(dateValue) {
  var tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  var stamp = Utilities.formatDate(dateValue || new Date(), tz, 'yyyyMMddHHmmss');
  var randomPart = Math.floor(Math.random() * 1679616).toString(36).toUpperCase();
  while (randomPart.length < 4) randomPart = '0' + randomPart;
  return 'CD' + stamp + randomPart;
}

function sheetByName(name) {
  // Use the intended destination explicitly. This also works if the Apps Script
  // project was created separately or accidentally attached to another sheet.
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function first(params, key) {
  return params[key] && params[key].length ? params[key][0] : '';
}

function joined(params, key) {
  return params[key] && params[key].length ? params[key].join(', ') : '';
}

function unique(values) {
  var seen = {};
  return values.filter(function(value) {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function naturalSort(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/* Safely updates headers while retaining existing rows under the same header names. */
function ensureHeaders(sheet, requestedHeaders) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var existingHeaders = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String) : [];
  var headers = unique(requestedHeaders.concat(existingHeaders));
  var unchanged = existingHeaders.length === headers.length && existingHeaders.every(function(header, index) {
    return header === headers[index];
  });

  if (!unchanged && lastRow > 1 && existingHeaders.length) {
    var oldData = sheet.getRange(2, 1, lastRow - 1, existingHeaders.length).getValues();
    var oldIndex = {};
    existingHeaders.forEach(function(header, index) { if (header) oldIndex[header] = index; });
    var remapped = oldData.map(function(row) {
      return headers.map(function(header) {
        return oldIndex[header] === undefined ? '' : row[oldIndex[header]];
      });
    });
    sheet.getDataRange().clearContent();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (remapped.length) sheet.getRange(2, 1, remapped.length, headers.length).setValues(remapped);
  } else if (!existingHeaders.length || !unchanged) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  return headers;
}

function appendRows(sheetName, rows, requestedHeaders) {
  if (!rows || !rows.length) return;
  var sheet = sheetByName(sheetName);
  var headers = ensureHeaders(sheet, requestedHeaders);
  var values = rows.map(function(row) {
    return headers.map(function(header) {
      var value = row[header];
      if (value === undefined || value === null) return '';
      return Array.isArray(value) ? value.join(', ') : value;
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function rawRow(params, responseId, submittedAt, headers) {
  var row = {};
  headers.forEach(function(header) {
    row[header] = header === 'responseId' ? responseId : header === 'Timestamp' ? submittedAt : joined(params, header);
  });
  return row;
}

function writeRaw(params, responseId, submittedAt) {
  var sheet = sheetByName(RAW_SHEET);
  var existing = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String) : [];
  var headers = unique(['responseId', 'Timestamp'].concat(existing, Object.keys(params)));
  appendRows(RAW_SHEET, [rawRow(params, responseId, submittedAt, headers)], headers);
}

function orderedRawKeys(params) {
  var keys = Object.keys(params);
  var exact = [
    'surveyStartTimestamp','surveySubmitTimestamp','surveyCompletionSeconds','fatigueMetrics','choiceBlock',
    'age','gender','originStateUT','originCityDistrict','occupation','income','education',
    'tripStatus','travelType','groupSize','groupAdults','groupChildren','groupElderly','groupAssistanceCount',
    'transportInfoSource','transportBookingMethod','transportDecisionMaker','yatraRegistration','transportBudget','trekFitness','healthLimitation',
    'yamunotri','gangotri','kedarnath','badrinath','hemkund','dhamCurrentVisit','repeatVisitReason','priorModeExp',
    'startPoint','otherStartPoint','totalDurationDays','onwardVehicleContinuity','returnJourneyType','returnVehicleContinuity',
    'kedarnathAccessType','kedarnathHelicopterBoardingPoint','kedarnathHelicopterTime','kedarnathHelicopterCost','kedarnathHelicopterWaitingTime',
    'railwayAwareness','hillTrainExperience','railwaySentiment','ropewayAwareness',
    'overallSatisfaction','intentToReturn','helicopterReducedCostIntent','integratedUse','integratedNoReason',
    'overallTripRating','challenge','feedbackChallenge','feedbackOther'
  ];
  var patterns = [
    /^ongoingDhamStatus_/, /^dhamSequence_/, /^primary/, /^mainHaulTransfer/, /^interDham/,
    /^return(Dham|Route|Mode|Time|Cost|FareBasis|Occupancy)/, /^rest/, /^lastMile/, /^stay/,
    /^(eval|lastMileEval)/, /^(main_haul|last_mile)_/, /^(priority|attitude|rel|norm|habit|ropeway|rail|env|wtp|maxAcceptable)/,
    /_otherSpecify$/
  ];
  var ordered = exact.filter(function(key) { return keys.indexOf(key) !== -1; });
  patterns.forEach(function(regex) {
    keys.filter(function(key) { return regex.test(key) && ordered.indexOf(key) === -1; }).sort(naturalSort)
      .forEach(function(key) { ordered.push(key); });
  });
  keys.filter(function(key) { return ordered.indexOf(key) === -1; }).sort(naturalSort)
    .forEach(function(key) { ordered.push(key); });
  return ordered;
}

function writeOrderedRaw(params, responseId, submittedAt) {
  var sheet = sheetByName(ORDERED_RAW_SHEET);
  var existing = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String) : [];
  var headers = unique(['responseId', 'Timestamp'].concat(orderedRawKeys(params), existing));
  appendRows(ORDERED_RAW_SHEET, [rawRow(params, responseId, submittedAt, headers)], headers);
}

/* Future-proof long-form table: every submitted question/value is recorded here. */
function writeResponseFields(params, responseId) {
  var rows = [];
  Object.keys(params).sort(naturalSort).forEach(function(field) {
    (params[field] || ['']).forEach(function(value, index) {
      rows.push({ responseId: responseId, fieldName: field, valueIndex: index + 1, fieldValue: value });
    });
  });
  appendRows('ResponseFields', rows, ['responseId','fieldName','valueIndex','fieldValue']);
}

function writeRespondent(params, responseId, submittedAt) {
  var headers = [
    'responseId','submittedAt','surveyStartTimestamp','surveySubmitTimestamp','surveyCompletionSeconds','fatigueMetrics','choiceBlock',
    'age','gender','originStateUT','originCityDistrict','occupation','income','education',
    'tripStatus','travelType','groupSize','groupAdults','groupChildren','groupElderly','groupAssistanceCount',
    'transportInfoSource','transportBookingMethod','transportDecisionMaker','yatraRegistration','transportBudget','trekFitness','healthLimitation',
    'startPoint','otherStartPoint','totalDurationDays','onwardVehicleContinuity','returnJourneyType','returnVehicleContinuity',
    'priorModeExp','railwayAwareness','hillTrainExperience','railwaySentiment','ropewayAwareness',
    'priorityTime','priorityCost','prioritySafety','priorityComfort','priorityReliability','priorityEnvironment','priorityCulture','priorityConvenience','priorityAccessibility',
    'attitudeRoadEnvironment','attitudeNatureConvenience','relPhysicalEffort','relVow','relTraditionalMode','relModernAcceptable','normTrekExpected','normPeerTrek',
    'habitSameMode','habitFamiliarMode','ropewayCostPreference','ropewaySpiritual','ropewaySafety','ropewayRecommend','ropewaySubsidy','attitudeRopewayCongestion',
    'wtpRopewayKedarnath','ropewayDriver','helicopterReducedCostIntent','integratedUse','integratedPayment','guaranteedSeatWtp','integratedNoReason',
    'integratedTime','integratedCost','integratedComfort','integratedReliability','integratedSafety','railStress','railCostConcern','railFlexibility',
    'railAccessibility','railCongestion','envLowEmission','envRestrict','envCess','maxAcceptableWait','overallSatisfaction','intentToReturn',
    'insuranceMedicalAwareness','overallTripRating','challenge','feedbackChallenge','feedbackSuggestions','feedbackOther'
  ];
  var row = { responseId: responseId, submittedAt: submittedAt };
  headers.forEach(function(header) { if (row[header] === undefined) row[header] = joined(params, header); });
  appendRows('Respondents', [row], headers);
}

function selectedDhams(params) {
  return params.dhamCurrentVisit || [];
}

function dhamSlug(dham) {
  return String(dham).replace(/\s/g, '');
}

function previousVisitKey(dham) {
  return dham === 'Hemkund Sahib' ? 'hemkund' : String(dham).toLowerCase();
}

function sequenceFor(params, dham) {
  var result = '';
  Object.keys(params).some(function(key) {
    var match = key.match(/^dhamSequence_(\d+)$/);
    if (match && first(params, key) === dham) { result = Number(match[1]); return true; }
    return false;
  });
  return result;
}

function writeDhamVisits(params, responseId) {
  var headers = ['responseId','dham','visitSequence','previousVisits','ongoingTripStatus','mainHaulTransfers','stayDuration','stayAccommodation','stayAccommodationCost'];
  var rows = selectedDhams(params).map(function(dham) {
    var slug = dhamSlug(dham);
    return {
      responseId: responseId, dham: dham, visitSequence: sequenceFor(params, dham),
      previousVisits: first(params, previousVisitKey(dham)), ongoingTripStatus: first(params, 'ongoingDhamStatus_' + slug),
      mainHaulTransfers: first(params, 'mainHaulTransferCount_' + slug), stayDuration: first(params, 'stayDuration_' + slug),
      stayAccommodation: first(params, 'stayAccom_' + slug), stayAccommodationCost: first(params, 'stayAccomCost_' + slug)
    };
  });
  appendRows('DhamVisits', rows, headers);
}

function suffixesFor(params, prefix) {
  return Object.keys(params).map(function(key) {
    var match = key.match(new RegExp('^' + prefix + '_(.+)$'));
    return match ? match[1] : null;
  }).filter(function(value) { return value !== null; }).sort(naturalSort);
}

function writeMainHaulSegments(params, responseId) {
  var headers = ['responseId','segmentId','dham','route','mode','timeHours','timeRange','cost','costRange','fareBasis','occupancy',
    'helicopterScope','helicopterCoveredDhams','helicopterBoardingPoint','helicopterPackageDuration','helicopterFareIncludes',
    'helicopterBookingDifficulty','helicopterWaiting','helicopterDisruption','helicopterWeightCharge'];
  var rows = suffixesFor(params, 'primaryDham').map(function(suffix) {
    return {
      responseId: responseId, segmentId: suffix, dham: first(params,'primaryDham_'+suffix), route: first(params,'primaryRoute_'+suffix),
      mode: first(params,'primaryMode_'+suffix), timeHours: first(params,'primaryTime_'+suffix), timeRange: first(params,'primaryTimeRange_'+suffix),
      cost: first(params,'primaryCost_'+suffix), costRange: first(params,'primaryCostRange_'+suffix), fareBasis: first(params,'primaryFareBasis_'+suffix),
      occupancy: first(params,'primaryOccupancy_'+suffix), helicopterScope: first(params,'primaryHelicopterScope_'+suffix),
      helicopterCoveredDhams: joined(params,'primaryHelicopterCoveredDhams_'+suffix), helicopterBoardingPoint: first(params,'primaryHelicopterBoardingPoint_'+suffix),
      helicopterPackageDuration: first(params,'primaryHelicopterPackageDuration_'+suffix), helicopterFareIncludes: joined(params,'primaryHelicopterFareIncludes_'+suffix),
      helicopterBookingDifficulty: first(params,'primaryHelicopterBookingDifficulty_'+suffix), helicopterWaiting: first(params,'primaryHelicopterWaiting_'+suffix),
      helicopterDisruption: joined(params,'primaryHelicopterDisruption_'+suffix), helicopterWeightCharge: first(params,'primaryHelicopterWeightCharge_'+suffix)
    };
  });
  appendRows('MainHaulSegments', rows, headers);
}

function writeMainHaulTransfers(params, responseId) {
  var headers = ['responseId','dham','transferIndex','location','modeAfterTransfer','timeAfterTransfer','costAfterTransfer','fareBasis','occupancy'];
  var rows = [];
  Object.keys(params).forEach(function(key) {
    var match = key.match(/^mainHaulTransferLocation_([A-Za-z]+)_(\d+)$/);
    if (!match) return;
    var suffix = match[1] + '_' + match[2];
    rows.push({ responseId:responseId, dham:match[1] === 'HemkundSahib' ? 'Hemkund Sahib' : match[1], transferIndex:Number(match[2]),
      location:first(params,key), modeAfterTransfer:first(params,'mainHaulTransferMode_'+suffix), timeAfterTransfer:first(params,'mainHaulTransferTime_'+suffix),
      costAfterTransfer:first(params,'mainHaulTransferCost_'+suffix), fareBasis:first(params,'mainHaulTransferFareBasis_'+suffix), occupancy:first(params,'mainHaulTransferOccupancy_'+suffix) });
  });
  appendRows('MainHaulTransfers', rows.sort(function(a,b){return naturalSort(a.dham+'_'+a.transferIndex,b.dham+'_'+b.transferIndex);}), headers);
}

function interDhamPairs(params) {
  return suffixesFor(params, 'interDhamFrom');
}

function writeInterDhamSegments(params, responseId) {
  var headers = ['responseId','pairId','from','to','route','transferCount','mode','time','cost','fareBasis','occupancy'];
  var rows = interDhamPairs(params).map(function(pair) {
    return { responseId:responseId, pairId:pair, from:first(params,'interDhamFrom_'+pair), to:first(params,'interDhamTo_'+pair),
      route:first(params,'interDhamRoute_'+pair), transferCount:first(params,'interDhamTransferCount_'+pair), mode:first(params,'interDhamMode_'+pair),
      time:first(params,'interDhamTime_'+pair), cost:first(params,'interDhamCost_'+pair), fareBasis:first(params,'interDhamFareBasis_'+pair), occupancy:first(params,'interDhamOccupancy_'+pair) };
  });
  appendRows('InterDhamSegments', rows, headers);

  var transferHeaders = ['responseId','pairId','transferIndex','location','modeAfterTransfer','timeAfterTransfer','costAfterTransfer','fareBasis','occupancy'];
  var transfers = [];
  Object.keys(params).forEach(function(key) {
    var match = key.match(/^interDhamTransferLocation_(.+)_(\d+)$/);
    if (!match) return;
    var suffix=match[1]+'_'+match[2];
    transfers.push({responseId:responseId,pairId:match[1],transferIndex:Number(match[2]),location:first(params,key),
      modeAfterTransfer:first(params,'interDhamTransferMode_'+suffix),timeAfterTransfer:first(params,'interDhamTransferTime_'+suffix),
      costAfterTransfer:first(params,'interDhamTransferCost_'+suffix),fareBasis:first(params,'interDhamTransferFareBasis_'+suffix),occupancy:first(params,'interDhamTransferOccupancy_'+suffix)});
  });
  appendRows('InterDhamTransfers', transfers, transferHeaders);
}

function writeReturnSegments(params, responseId) {
  var headers=['responseId','returnJourneyType','returnVehicleContinuity','segmentIndex','segmentId','dham','route','mode','time','cost','fareBasis','occupancy'];
  var dhams=params['returnDham[]']||[], routes=params['returnRoute[]']||[];
  var suffixes=suffixesFor(params,'returnMode');
  var count=Math.max(dhams.length,routes.length,suffixes.length);
  var rows=[];
  for(var i=0;i<count;i++){
    var suffix=suffixes[i]||'';
    rows.push({responseId:responseId,returnJourneyType:first(params,'returnJourneyType'),returnVehicleContinuity:first(params,'returnVehicleContinuity'),
      segmentIndex:i+1,segmentId:suffix,dham:dhams[i]||'',route:routes[i]||'',mode:first(params,'returnMode_'+suffix),time:first(params,'returnTime_'+suffix),
      cost:first(params,'returnCost_'+suffix),fareBasis:first(params,'returnFareBasis_'+suffix),occupancy:first(params,'returnOccupancy_'+suffix)});
  }
  appendRows('ReturnSegments',rows,headers);
}

function writeStopovers(params, responseId) {
  var headers=['responseId','stopIndex','route','location','purpose','durationHours','facilityType','cost'];
  var rows=suffixesFor(params,'restRoute').map(function(suffix){return {responseId:responseId,stopIndex:suffix,route:first(params,'restRoute_'+suffix),
    location:first(params,'restLocation_'+suffix),purpose:first(params,'restPurpose_'+suffix),durationHours:first(params,'restDuration_'+suffix),
    facilityType:first(params,'restAccom_'+suffix),cost:first(params,'restCost_'+suffix)};});
  appendRows('Stopovers',rows,headers);
}

function writeLastMileTrips(params, responseId) {
  var headers=['responseId','dham','kedarnathAccessType','approachMode','approachTime','approachCost','approachWaitingTime',
    'helicopterBoardingPoint','helicopterTime','helicopterCost','helicopterWaitingTime','route','mode','timeHours','cost',
    'returnType','returnMode','returnTimeHours','returnCost','stayDuration','stayAccommodation','stayAccommodationCost'];
  var rows=selectedDhams(params).map(function(dham){var slug=dhamSlug(dham);return {responseId:responseId,dham:dham,
    kedarnathAccessType:dham==='Kedarnath'?first(params,'kedarnathAccessType'):'',approachMode:first(params,'lastMileApproachMode_'+slug),
    approachTime:first(params,'lastMileApproachTime_'+slug),approachCost:first(params,'lastMileApproachCost_'+slug),approachWaitingTime:first(params,'lastMileApproachWaitingTime_'+slug),
    helicopterBoardingPoint:dham==='Kedarnath'?first(params,'kedarnathHelicopterBoardingPoint'):'',helicopterTime:dham==='Kedarnath'?first(params,'kedarnathHelicopterTime'):'',
    helicopterCost:dham==='Kedarnath'?first(params,'kedarnathHelicopterCost'):'',helicopterWaitingTime:dham==='Kedarnath'?first(params,'kedarnathHelicopterWaitingTime'):'',
    route:first(params,'lastMileRoute_'+slug),mode:first(params,'lastMileMode_'+slug),timeHours:first(params,'lastMileTime_'+slug),cost:first(params,'lastMileCost_'+slug),
    returnType:first(params,'lastMileReturnType_'+slug),returnMode:first(params,'lastMileReturnMode_'+slug),returnTimeHours:first(params,'lastMileReturnTime_'+slug),
    returnCost:first(params,'lastMileReturnCost_'+slug),stayDuration:first(params,'stayDuration_'+slug),stayAccommodation:first(params,'stayAccom_'+slug),
    stayAccommodationCost:first(params,'stayAccomCost_'+slug)};});
  appendRows('LastMileTrips',rows,headers);
}

function writeServiceEvaluations(params, responseId) {
  var headers=['responseId','evalFindBoard','evalReliability','evalComfort','evalSafety','evalCostFair','evalTimeAccept','evalInfo','evalSignage',
    'lastMileEvalFindBoard','lastMileEvalReliability','lastMileEvalComfort','lastMileEvalSafety','lastMileEvalCostFair','lastMileEvalTimeAccept','lastMileEvalInfo','lastMileEvalSignage'];
  var row={responseId:responseId};
  headers.forEach(function(header){if(header!=='responseId')row[header]=joined(params,header);});
  appendRows('ServiceEvaluations',[row],headers);
}

function writeChoiceResponses(params, responseId) {
  var headers=['responseId','experiment','dham','task','chosenOptionCode','chosenOptionLabel'];
  var rows=[];
  Object.keys(params).forEach(function(key){var match=key.match(/^(main_haul|last_mile)_([A-Za-z]+)_Task(\d+)$/);if(!match)return;
    var raw=first(params,key);var colon=raw.indexOf(':');rows.push({responseId:responseId,experiment:match[1],
      dham:match[2]==='HemkundSahib'?'Hemkund Sahib':match[2],task:Number(match[3]),chosenOptionCode:colon<0?raw:raw.slice(0,colon),chosenOptionLabel:colon<0?'':raw.slice(colon+1).trim()});});
  appendRows('ChoiceResponses',rows,headers);
}
