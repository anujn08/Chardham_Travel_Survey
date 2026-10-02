const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Range {
  constructor(sheet, row, col, rows, cols) { Object.assign(this, {sheet,row,col,rows,cols}); }
  getValues() {
    return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>this.sheet.data[this.row-1+r]?.[this.col-1+c] ?? ''));
  }
  setValues(values) {
    values.forEach((line,r)=>line.forEach((value,c)=>{
      const y=this.row-1+r,x=this.col-1+c;
      while(this.sheet.data.length<=y)this.sheet.data.push([]);
      this.sheet.data[y][x]=value;
    }));
    return this;
  }
  clearContent() {
    for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++)if(this.sheet.data[this.row-1+r])this.sheet.data[this.row-1+r][this.col-1+c]='';
    return this;
  }
}
class Sheet {
  constructor(){this.data=[];}
  getLastRow(){let n=this.data.length;while(n&&!(this.data[n-1]||[]).some(v=>v!==''&&v!=null))n--;return n;}
  getLastColumn(){return this.data.reduce((max,row)=>Math.max(max,row.length),0);}
  getRange(r,c,rows=1,cols=1){return new Range(this,r,c,rows,cols);}
  getDataRange(){return new Range(this,1,1,Math.max(this.getLastRow(),1),Math.max(this.getLastColumn(),1));}
  setFrozenRows(){}
}
function load(){
  const sheets={};
  const spreadsheet={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=new Sheet())};
  const context={console,Date,Math,JSON,String,Number,Array,Object,RegExp,
    SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,openById:id=>{assert.equal(id,'12VtOBJ8uUp1hFmc1JyQbblZz9zOJAuyzddgfWpsOwYw');return spreadsheet;}},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Session:{getScriptTimeZone:()=> 'Asia/Kolkata'},
    Utilities:{formatDate:()=> '20260923170000'},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})}
  };
  vm.createContext(context);vm.runInContext(fs.readFileSync('google_apps_script.gs','utf8'),context);
  return {context,sheets};
}
const row=(sheet,index=1)=>Object.fromEntries(sheet.data[0].map((header,column)=>[header,sheet.data[index][column]]));

test('current survey fields reach raw and normalized tabs',()=>{
  const {context,sheets}=load();
  const parameters={
    age:['45-54'],tripStatus:['Completed'],travelType:['Group'],groupSize:['4'],transportBudget:['Rs 5000-10000'],
    trekFitness:['Manageable with rests'],healthLimitation:['Minor'],dhamCurrentVisit:['Kedarnath','Badrinath'],
    kedarnath:['1'],badrinath:['0'],dhamSequence_1:['Kedarnath'],dhamSequence_2:['Badrinath'],ongoingDhamStatus_Kedarnath:['Completed'],
    primaryDham_Kedarnath_route:['Kedarnath'],primaryRoute_Kedarnath_route:['Haridwar to Sonprayag'],primaryMode_Kedarnath_route:['Bus/MiniBus'],
    primaryTime_Kedarnath_route:['8'],primaryCost_Kedarnath_route:['900'],primaryFareBasis_Kedarnath_route:['Per person'],primaryOccupancy_Kedarnath_route:['20'],
    mainHaulTransferLocation_Kedarnath_1:['Rudraprayag'],mainHaulTransferMode_Kedarnath_1:['Shared Jeep/Shared Taxi'],mainHaulTransferTime_Kedarnath_1:['2'],
    interDhamFrom_Kedarnath__Badrinath:['Sonprayag'],interDhamTo_Kedarnath__Badrinath:['Badrinath'],interDhamMode_Kedarnath__Badrinath:['Bus/MiniBus'],
    interDhamTime_Kedarnath__Badrinath:['7'],interDhamCost_Kedarnath__Badrinath:['800'],interDhamFareBasis_Kedarnath__Badrinath:['Per person'],
    'returnDham[]':['Badrinath'],'returnRoute[]':['Badrinath to Haridwar'],returnMode_testrow:['Bus/MiniBus'],returnTime_testrow:['10'],returnCost_testrow:['900'],
    lastMileRoute_Kedarnath:['Gaurikund to Kedarnath'],lastMileMode_Kedarnath:['Trek/Walk'],lastMileTime_Kedarnath:['7'],lastMileCost_Kedarnath:['0'],
    lastMileReturnType_Kedarnath:['Different'],lastMileReturnMode_Kedarnath:['Pony/Mule'],lastMileReturnCost_Kedarnath:['2500'],
    main_haul_Kedarnath_Task1:['C: Railway + Feeder Bus'],prioritySafety:['5'],evalFindBoard:['4'],lastMileEvalSafety:['5'],
    feedbackOther:['SYNTHETIC TEST ONLY | check-new-script'],newFutureQuestion:['future value']
  };
  const result=JSON.parse(context.doPost({parameters}).text);
  assert.equal(result.result,'success');assert.match(result.responseId,/^CD/);
  assert.equal(row(sheets.Sheet1).newFutureQuestion,'future value');
  assert.equal(row(sheets.RawOrdered).newFutureQuestion,'future value');
  assert.equal(row(sheets.Respondents).transportBudget,'Rs 5000-10000');
  assert.equal(row(sheets.Respondents).trekFitness,'Manageable with rests');
  assert.equal(row(sheets.Respondents).healthLimitation,'Minor');
  assert.equal(row(sheets.DhamVisits).visitSequence,1);
  assert.equal(row(sheets.MainHaulSegments).fareBasis,'Per person');
  assert.equal(row(sheets.MainHaulTransfers).location,'Rudraprayag');
  assert.equal(row(sheets.InterDhamSegments).mode,'Bus/MiniBus');
  assert.equal(row(sheets.ReturnSegments).route,'Badrinath to Haridwar');
  assert.equal(row(sheets.LastMileTrips).returnMode,'Pony/Mule');
  assert.equal(row(sheets.Respondents).prioritySafety,'5');
  assert.equal(row(sheets.ServiceEvaluations).evalFindBoard,'4');
  assert.equal(row(sheets.ServiceEvaluations).lastMileEvalSafety,'5');
  assert.equal(row(sheets.ChoiceResponses).chosenOptionCode,'C');
  assert.ok(sheets.ResponseFields.data.slice(1).some(r=>r[1]==='newFutureQuestion'&&r[3]==='future value'));
  assert.equal(sheets.Stopovers,undefined);
  assert.equal(sheets.ReturnSegments.data.length,2);
});

test('adding normalized columns retains existing rows under their headers',()=>{
  const {context,sheets}=load();
  sheets.Respondents=new Sheet();
  sheets.Respondents.data=[['responseId','age','legacyColumn'],['OLD1','25-34','keep me']];
  context.writeRespondent({age:['35-44'],transportBudget:['Above Rs 20000']},'NEW1',new Date());
  assert.equal(row(sheets.Respondents).responseId,'OLD1');
  assert.equal(row(sheets.Respondents).age,'25-34');
  assert.equal(row(sheets.Respondents).legacyColumn,'keep me');
  assert.equal(row(sheets.Respondents,2).transportBudget,'Above Rs 20000');
});
