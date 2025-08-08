// sap.ui.define([
//     "sap/ui/core/mvc/Controller",
//     "sap/ui/model/Filter",
//     "sap/ui/model/FilterOperator",
//     "sap/ui/model/json/JSONModel",
//     "../model/formatter",
//     'sap/ui/export/Spreadsheet',
//     "sap/ui/export/library"
// ], (Controller, Filter, FilterOperator, JSONModel, formatter, Spreadsheet, exportLibrary) => {
//     "use strict";
//     var that;
//     var EdmType = exportLibrary.EdmType;
//     return Controller.extend("vcpapp.vcpibpcalendarmaintenance.controller.Home", {
//         formatter: formatter,
//         onInit() {
//             that = this;
//             that.teleData = [];
//             this.getOwnerComponent().getModel("oModel").callFunction("/getTelescopicValues", {
//                 success: function (oData) {
//                     var data = JSON.parse(oData.getTelescopicValues);
//                     if (data?.MaxFcharPlan != null) {
//                         that.teleData = new Date(data?.MaxFcharPlan);
//                     }
//                 },
//                 error: function (e) {

//                 }
//             })

//             this.getOwnerComponent().getModel("oModel").read("/getTelescopicData", {
//                 success: function (oData) {
//                     var data = (oData.results);
//                     var telescopicModel = new sap.ui.model.json.JSONModel({ results: data });
//                     that.byId("idTelescopicTabCM").setModel(telescopicModel);
//                 }
//             });
//             var oViewModel = new sap.ui.model.json.JSONModel({
//                 showFooter: true // default to true for first tab
//             });
//             this.getView().setModel(oViewModel, "viewModel");
//         },
//         onAfterRendering: function () {
//             that.descArray = [];
//             sap.ui.core.BusyIndicator.show();
//             that.ibpCalenderWeek = [], that.Flag = '';
//             var oFilters = [];
//             // oFilters.push(new Filter("LEVEL", FilterOperator.NE, null))
//             this.getOwnerComponent().getModel("oModel").read("/getIBPCalenderWeek", {
//                 // filters: [oFilters],
//                 success: function (oData) {
//                     if (oData.results.length > 0) {
//                         var lgTime = new Date().getTimezoneOffset();
//                         oData.results.forEach(el => {
//                             // // el.PERIODSTART_UTC = that.formattedDate(new Date(el.PERIODSTART).toISOString());
//                             // // el.PERIODEND_UTC = that.formattedDate(new Date(el.PERIODEND).toISOString());
//                             // el.PERIODSTART_UTC = that.formattedDate(el.PERIODSTART);
//                             // el.PERIODEND_UTC = that.formattedDate(el.PERIODEND);
//                             // var start = new Date(el.PERIODSTART);
//                             // var end = new Date(el.PERIODEND);

//                             // el.PERIODSTART_UTC = new Date(start.setTime(start.getTime() + (lgTime * 60 * 1000)));
//                             // el.PERIODEND_UTC = new Date(end.setTime(end.getTime() - (lgTime * 60 * 1000)));
//                             el.TempID = parseInt(el.PERIODID);
//                             el.PERIODSTART_UTC = new Date(el.PERIODSTART);
//                             el.PERIODEND_UTC = new Date(el.PERIODEND);
//                             that.descArray.push(el.PERIODDESC);
//                         });
//                         that.ibpCalenderWeek = oData.results.sort((a, b) => parseInt(a.PERIODID) - parseInt(b.PERIODID));
//                         var newModel = new JSONModel();
//                         newModel.setData({ results: oData.results });
//                         that.byId("idTabCM").setModel(newModel);
//                     }
//                     else {
//                         sap.m.MessageToast.show("No data available in VCP Calender week")
//                     }
//                     sap.ui.core.BusyIndicator.hide();
//                 },
//                 error: function (e) {
//                     sap.ui.core.BusyIndicator.hide();
//                     sap.m.MessageToast.show("Failed to get VCP Calender data")
//                 }
//             })
//         },
//         formattedDate: function (date1) {
//             const date = new Date(date1);
//             // Convert to UTC components
//             const year = date.getUTCFullYear();
//             const month = String(date.getUTCMonth() + 1).padStart(2, '0');
//             const day = String(date.getDate()).padStart(2, '0');

//             // Construct desired string with fixed time and nanoseconds
//             const formattedDate = `${year}-${month}-${day}`;
//             return formattedDate;
//         },
//         formattedDateStart: function (date1, flag) {
//             const date = new Date(date1);
//             // Convert to UTC components
//             const year = date.getUTCFullYear();
//             const month = String(date.getUTCMonth() + 1).padStart(2, '0');
//             const day = String(date.getDate()).padStart(2, '0');

//             // Construct desired string with fixed time and nanoseconds
//             if (flag === '') {
//                 let formattedDate = `${year}-${month}-${day} 00:00:00.000000000`;
//                 return formattedDate;
//             }
//             else {
//                 let formattedDate = `${year}-${month}-${day} 23:59:00.000000000`;
//                 return formattedDate;
//             }
//         },
//         formattedNewDate: function (date) {
//             const input = date;
//             var date1 = new Date(date);
//             const [month, day, year] = input.split(" ")[0].split("/");
//             const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
//             const dateUTC = new Date(Date.UTC(
//                 fullYear,
//                 parseInt(month) - 1,
//                 parseInt(day),
//             ));
//             const formattedUTCDate = dateUTC.getUTCFullYear() + "-" +
//                 String(dateUTC.getUTCMonth() + 1).padStart(2, '0') + "-" +
//                 String(date1.getDate()).padStart(2, '0');
//             return formattedUTCDate;
//         },
//         onUpload1: function (e) {
//             sap.ui.core.BusyIndicator.show();
//             this.importExcel(e.getParameter("files") && e.getParameter("files")[0]);
//         },
//         importExcel: function (file) {
//             if (!file.type.endsWith("spreadsheetml.sheet") &&
//                 !file.type.endsWith("csv")) {
//                 return sap.m.MessageToast.show("Please upload only files of type XLSX");
//             }
//             sap.ui.core.BusyIndicator.show();
//             var excelData = [];
//             if (file && window.FileReader) {
//                 var reader = new FileReader();
//                 reader.onload = function (e) {
//                     var data = e.target.result;
//                     var workbook = XLSX.read(data, {
//                         type: 'binary'
//                     });
//                     workbook.SheetNames.forEach(function (sheetName) {
//                         // Here is your object for every sheet in workbook
//                         excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
//                         if (excelData.length > 0) {
//                             that.Emport(excelData);
//                         }
//                         else {
//                             sap.ui.core.BusyIndicator.hide();
//                             if (that.uploadFlag !== "X") {
//                                 return sap.m.MessageToast.show("No data available in the uploaded file");
//                             }
//                             that.uploadFlag = '';
//                         }
//                     });
//                 }
//                 reader.onerror = function (ex) {
//                     sap.ui.core.BusyIndicator.hide();
//                     console.log(ex);

//                 };
//                 reader.readAsBinaryString(file);

//             }
//         },
//         Emport: function (array) {
//             that.uploadFlag = "X";
//             var lgTime = new Date().getTimezoneOffset();
//             var data = array;
//             data.forEach(el => {
//                 if (el.LEVEL === 'W') {
//                     el.TPLEVEL = 3;
//                 }
//                 else if (el.LEVEL === 'M') {
//                     el.TPLEVEL = 4;
//                 }
//                 else if (el.LEVEL === 'Q') {
//                     el.TPLEVEL = 5;
//                 }

//                 var start = new Date(el.PERIODSTART);
//                 var end = new Date(el.PERIODEND);

//                 el.PERIODSTART_UTC = new Date(start.setTime(start.getTime() - (lgTime * 60 * 1000)));
//                 el.PERIODEND_UTC = new Date(end.setTime(end.getTime() - (lgTime * 60 * 1000)));
//                 // el.PERIODSTART_UTC = that.formattedNewDate(el.PERIODSTART);
//                 // el.PERIODEND_UTC = that.formattedNewDate(el.PERIODEND);
//                 el.WEEKWEIGHT = (el.WEEKWEIGHT);
//                 el.MONTHWEIGHT = (el.MONTHWEIGHT);
//             });
//             data.sort((a, b) => {
//                 // Sort by TPLEVEL (ascending)
//                 if (a.TPLEVEL !== b.TPLEVEL) {
//                     return a.TPLEVEL - b.TPLEVEL;
//                 }
//                 // If TPLEVEL is equal, sort by PERIODSTART (as Date)
//                 const dateA = new Date(a.PERIODSTART);
//                 const dateB = new Date(b.PERIODSTART);
//                 return dateA - dateB;
//             });
//             var endDate = that.teleData;
//             if (that.ibpCalenderWeek.length > 0) {
//                 if (endDate != undefined || endDate != null) {
//                     const tableData = that.ibpCalenderWeek;
//                     const excelData = data;
//                     var sameData = that.compareArrays(tableData, excelData);
//                     if (sameData) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Same file uploaded");
//                     }
//                     // Split by TPLEVEL once
//                     const getByLevel = (arr, level) => arr.filter(item => item.TPLEVEL === level);

//                     const weekTableData = getByLevel(tableData, 3);
//                     const monthTableData = getByLevel(tableData, 4);
//                     const quarterTableData = getByLevel(tableData, 5);

//                     const weekExcelData = getByLevel(excelData, 3);
//                     const monthExcelData = getByLevel(excelData, 4);
//                     const quarterExcelData = getByLevel(excelData, 5);

//                     // Check date continuity
//                     const weekUploadData = that.checkContinuousFlow(weekExcelData);
//                     if (!weekUploadData) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Discontinuity in week dates. Please re-upload correct file");
//                     }

//                     const monthUploadData = that.checkContinuousFlow(monthExcelData);
//                     if (!monthUploadData) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Discontinuity in month dates. Please re-upload correct file");
//                     }

//                     const quarterUploadData = that.checkContinuousFlow(quarterExcelData);
//                     if (!quarterUploadData) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Discontinuity in quarter dates. Please re-upload correct file");
//                     }
//                     //Check if uploaded data ends with same Period 
//                     const lastFinalWeek = weekExcelData.at(-1);
//                     const lastMonth = monthExcelData.at(-1);
//                     const lastQuarter = quarterExcelData.at(-1);
//                     const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];
//                     // Compare last month with last week
//                     const isMonthMatchingWeek = getSortableDate(new Date(lastFinalWeek.PERIODEND_UTC)) === getSortableDate(new Date(lastQuarter.PERIODEND_UTC));
//                     if (!isMonthMatchingWeek) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Quarter end doesn't match with weekly data");
//                     }

//                     // Compare last month with quarter range
//                     const isMonthInQuarter =
//                     getSortableDate(new Date(lastMonth.PERIODEND_UTC)) === getSortableDate(new Date(lastQuarter.PERIODEND_UTC));

//                     if (!isMonthInQuarter) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Quarter end doesn't match with monthly data");
//                     }

//                     //Function for Weekly data upload
//                     var finalWeekData = that.finalWeekData(weekTableData, weekExcelData, that.teleData);

//                     //Function for Monthly data upload
//                     var finalMonthData = that.finalMonthData(monthTableData, monthExcelData, that.teleData);

//                     // //Function for Quarter data upload
//                     var finalQuarterData = that.finalQuarterData(quarterTableData, quarterExcelData, that.teleData);

//                     if (finalWeekData.length === 0 || finalMonthData.length === 0 || finalQuarterData.length === 0) {
//                         sap.ui.core.BusyIndicator.hide();
//                         return sap.m.MessageToast.show("Continuous data not available. Please re-uplaod correct data")
//                     }
//                     else {

//                         var finalMergdeData = [...finalWeekData, ...finalMonthData, ...finalQuarterData];
//                         finalMergdeData.forEach(obj => obj.PERIODID = Number(obj.PERIODID));
//                         // Fix sequence
//                         for (let i = 1; i < finalMergdeData.length; i++) {
//                             let prev = Number(finalMergdeData[i - 1].PERIODID);
//                             if (Number.isNaN(prev)) {
//                                 finalMergdeData[i - 1].PERIODID = 0;
//                                 prev = 0;
//                             }
//                             let curr = Number(finalMergdeData[i].PERIODID);

//                             if (isNaN(curr) || curr <= prev) {
//                                 if (!isNaN(prev)) {
//                                     finalMergdeData[i].PERIODID = prev + 1;
//                                 } else {
//                                     finalMergdeData[i].PERIODID = 1; // fallback if even previous is bad
//                                 }
//                             }
//                         }
//                         that.ibpCalenderWeek = finalMergdeData;
//                         var newModel = new JSONModel();
//                         newModel.setData({ results: finalMergdeData });
//                         that.byId("idTabCM").setModel(newModel);
//                     }

//                     if (that.Flag === "X") {
//                         sap.m.MessageToast.show("Duplicates exists in Period Descriptions. Please recheck")
//                         that.byId("idSaveCM").setEnabled(false);
//                     }
//                     else {
//                         that.Flag = '';
//                         that.byId("idSaveCM").setEnabled(true);
//                     }
//                 }
//                 else {
//                     // data.forEach(el => {
//                     //   // el.PERIODSTART_UTC = that.formattedDate(new Date(el.PERIODSTART).toISOString());
//                     //   // el.PERIODEND_UTC = that.formattedDate(new Date(el.PERIODEND).toISOString());
//                     //   el.TPLEVEL = parseInt(el.TPLEVEL);
//                     // });
//                     //Check for duplicate period desc
//                     const periodDescMap = new Map();
//                     data.forEach(obj => {
//                         const desc = obj.PERIODDESC;
//                         periodDescMap.set(desc, (periodDescMap.get(desc) || 0) + 1);
//                     });
//                     data = data.map(obj => {
//                         if (periodDescMap.get(obj.PERIODDESC) > 1) {
//                             that.Flag = "X";
//                             return { ...obj, ISDUPLICATEDESC: true };
//                         }
//                         return obj;
//                     });
//                     var newModel = new JSONModel();
//                     newModel.setData({ results: data });
//                     that.byId("idTabCM").setModel(newModel);
//                     if (that.Flag === "X") {
//                         sap.m.MessageToast.show("Duplicates exists in Period Descriptions. Please recheck")
//                         that.byId("idSaveCM").setEnabled(false);
//                     }
//                     else {
//                         that.Flag = '';
//                         that.byId("idSaveCM").setEnabled(true);
//                     }
//                 }
//             }
//             else {
//                 that.emptIBPCalenderWeek(data);
//             }
//             sap.ui.core.BusyIndicator.hide();
//         },
//         mergeWithoutConflicts: function (array1, array2) {
//             // Step 1: Create Sets for conflict detection
//             const startSet = new Set(array1.map(obj => `${obj.TPLEVEL}-${new Date(obj.PERIODSTART_UTC)}`));
//             const endSet = new Set(array1.map(obj => `${obj.TPLEVEL}-${new Date(obj.PERIODEND_UTC)}`));

//             // Step 2: Exclude conflicting items from array2
//             const nonConflictingArray2 = array2.filter(obj => {
//                 const startKey = `${obj.TPLEVEL}-${new Date(obj.PERIODSTART_UTC)}`;
//                 const endKey = `${obj.TPLEVEL}-${new Date(obj.PERIODEND_UTC)}`;
//                 return !startSet.has(startKey) && !endSet.has(endKey);
//             });

//             // Step 3: Merge array1 with non-conflicting items from array2
//             const merged = [...array1, ...nonConflictingArray2];
//             // Step 4: Count PERIODDESC occurrences
//             const periodDescMap = new Map();
//             merged.forEach(obj => {
//                 const desc = obj.PERIODDESC;
//                 periodDescMap.set(desc, (periodDescMap.get(desc) || 0) + 1);
//             });

//             // Step 5: Add ISDUPLICATEDESC if PERIODDESC appears more than once
//             const final = merged.map(obj => {
//                 if (periodDescMap.get(obj.PERIODDESC) > 1) {
//                     that.Flag = "X";
//                     return { ...obj, ISDUPLICATEDESC: true };
//                 }
//                 return obj;
//             });
//             return final;
//         },
//         //Function to save entries into VCP calender
//         onSavePress: function () {
//             sap.ui.core.BusyIndicator.show();
//             var tableData = that.byId("idTabCM").getItems();
//             var final = {}, finalArray = [];
//             tableData.forEach(el => {
//                 if (el.getCells()[7].getText() === '') {
//                     var monthWeight = null;
//                 }
//                 else {
//                     var monthWeight = parseInt(el.getCells()[7].getText());
//                 }
//                 var text = el.getCells()[1].getText().replace(/\s+/g, "")
//                 if(text==='Week'){
//                     var level = 'W';
//                 }
//                 else if(text==='Month'){
//                     var level = 'M';
//                 }
//                 else if(text==='Quarter'){
//                     var level = 'Q';
//                 }
//                 final.TPLEVEL = parseInt(el.getCells()[0].getText()),
//                     final.PERIODID = el.getCells()[2].getText(),
//                     final.LEVEL = level,
//                     final.PERIODSTART = that.formattedDateStart(el.getCells()[3].getText(), ''),
//                     final.PERIODEND = that.formattedDateStart(el.getCells()[4].getText(), 'X'),
//                     final.PERIODDESC = el.getCells()[5].getValue(),
//                     final.MONTHWEIGHT = monthWeight,
//                     final.WEEKWEIGHT = 7,
//                     final.WEEK_STARTDATE = el.getCells()[8].getText(),
//                     final.WEEK_ENDDATE = el.getCells()[9].getText(),
//                     finalArray.push(final);
//                 final = {};
//             })
//             this.getOwnerComponent().getModel("oModel").callFunction("/updateCalenderWeek", {
//                 method: "GET",
//                 urlParameters: {
//                     CalendarData: JSON.stringify(finalArray)
//                 },
//                 success: function (oData) {
//                     if (oData.updateCalenderWeek.includes("Successfully")) {
//                         sap.m.MessageToast.show("Updated successfully");
//                         that.onAfterRendering();
//                     }
//                     else {
//                         sap.m.MessageToast.show("Updation failed")
//                     }

//                     sap.ui.core.BusyIndicator.hide();
//                 },
//                 error: function (e) {
//                     sap.ui.core.BusyIndicator.hide();
//                     sap.m.MessageToast.show("Error while updating");
//                 }
//             })
//         },
//         //Live Change of input
//         onPeriodChange: function (oEvent) {
//             var input = oEvent.getSource();
//             var inputValue = input.getValue();
//             const indexes = [];
//             that.byId("idTabCM").getItems().forEach((value, index) => {
//                 if (value.getCells()[5].getValue() === inputValue) {
//                     indexes.push(index);
//                 }
//             });
//             if (indexes.length > 1) {
//                 input.setValueState("Error");
//                 input.setValueStateText("Entry already exists");
//                 that.byId("idSaveCM").setEnabled(false);
//             }
//             else {
//                 input.setValueState("None");
//                 that.byId("idSaveCM").setEnabled(true);
//             }
//         },
//         onPressBrowse: function (oEvent) {
//             that.byId("FileUploaderCM").openFilePicker(oEvent);
//         },
//         //download excel template
//         oDownloadTemplate: function () {
//             var aDown = that.ibpCalenderWeek;
//             var oSettings, oSheet;
//             var sFileName = "VCP Calender Template";
//             var aCols = []
//             if (aDown.length) {
//                 var downloadableData = this.getDownloadData(aDown, that.teleData);
//                 const keys = Object.keys(aDown[0]);
//                 const allowedKeys = ['LEVEL', 'PERIODSTART', 'PERIODEND', 'PERIODDESC', 'WEEKWEIGHT', 'MONTHWEIGHT'];
//                 keys
//                     .filter(key => allowedKeys.includes(key))
//                     .forEach(key => {
//                         aCols.push({
//                             property: key,
//                             type: EdmType.String,
//                             label: key
//                         });
//                     });
//                 var oSettings = {
//                     workbook: {
//                         columns: aCols
//                     },
//                     dataSource: downloadableData,
//                     fileName: sFileName,
//                     worker: false
//                 };
//                 var oSheet = new Spreadsheet(oSettings);
//                 oSheet.build().finally(function () {
//                     oSheet.destroy();
//                 });
//             }
//             else {
//                 const allowedKeys = ['LEVEL', 'PERIODSTART', 'PERIODEND', 'PERIODDESC', 'WEEKWEIGHT', 'MONTHWEIGHT'];
//                 allowedKeys
//                     .forEach(key => {
//                         aCols.push({
//                             property: key,
//                             type: EdmType.String,
//                             label: key
//                         });
//                     });
//                 var oSettings = {
//                     workbook: {
//                         columns: aCols
//                     },
//                     dataSource: [],
//                     fileName: sFileName,
//                     worker: false
//                 };
//                 var oSheet = new Spreadsheet(oSettings);
//                 oSheet.build().finally(function () {
//                     oSheet.destroy();
//                 });
//             }
//         },
//         checkContinuousFlow: function (periods) {
//             for (let i = 1; i < periods.length; i++) {
//                 const prevEnd = new Date(periods[i - 1].PERIODEND);
//                 const currStart = new Date(periods[i].PERIODSTART);
//                 // Add 1 day to previous end
//                 prevEnd.setDate(prevEnd.getDate() + 1);
//                 prevEnd.setHours(0, 0, 0, 0); // normalize to 00:00    
//                 if (currStart.getTime() !== prevEnd.getTime()) {
//                     console.log(`Discontinuity found at index ${i}: Expected ${prevEnd}, but got ${currStart}`);
//                     return false;
//                 }
//             }
//             console.log("All dates are in weekly continuation ✅");
//             return true;
//         },

//         finalWeekData: function (tabData, excelData, date) {
//             var finalWeekDataConcat = [];
//             //check for continuation of uploadata
//             var lastTabData = tabData.at(-1);
//             const prevEnd = new Date(lastTabData.PERIODEND);
//             const currStart = new Date(excelData[0].PERIODSTART);
//             // Add 1 day to previous end
//             prevEnd.setDate(prevEnd.getDate() + 1);
//             prevEnd.setHours(0, 0, 0, 0); // normalize to 00:00    
//             if (currStart.getTime() === prevEnd.getTime()) {
//                 finalWeekDataConcat = tabData.concat(excelData);
//                 return finalWeekDataConcat;
//             }
//             const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];
//             const indexInWeek = excelData.findIndex(el =>
//                 getSortableDate(el.PERIODSTART_UTC) <= getSortableDate(date) &&
//                 getSortableDate(el.PERIODEND_UTC) >= getSortableDate(date)
//             );
//             if (indexInWeek === -1) {

//                 const findTableMatch = tabData.findIndex(el => getSortableDate(el.PERIODSTART_UTC) === getSortableDate(excelData[0].PERIODSTART_UTC)
//                     && getSortableDate(el.PERIODEND_UTC) === getSortableDate(excelData[0].PERIODEND_UTC));
//                 if (findTableMatch != -1) {
//                     var weekTableSlicedData = tabData.slice(0, findTableMatch);
//                     finalWeekDataConcat = weekTableSlicedData.concat(excelData);
//                 }
//                 else {
//                     sap.ui.core.BusyIndicator.hide();
//                     sap.m.MessageToast.show("Weekly data doesn't have continuity. Please check again");
//                 }
//             }
//             else {
//                 var excelIndex = excelData.slice(indexInWeek + 1);
//                 var tabIndex = tabData.findIndex(el => getSortableDate(el.PERIODSTART_UTC) === getSortableDate(excelIndex[0].PERIODSTART_UTC)
//                     && getSortableDate(el.PERIODEND_UTC) === getSortableDate(excelIndex[0].PERIODEND_UTC))
//                 var tableData1 = tabData.slice(0, tabIndex + 1);
//                 finalWeekDataConcat = tableData1.concat(excelIndex);

//             }

//             return finalWeekDataConcat;
//         },
//         finalMonthData: function (tabData, excelData, date) {
//             var finalWeekDataConcat = [];
//             //check for continuation of uploadata
//             var lastTabData = tabData.at(-1);
//             const prevEnd = new Date(lastTabData.PERIODEND);
//             const currStart = new Date(excelData[0].PERIODSTART);
//             // Add 1 day to previous end
//             prevEnd.setDate(prevEnd.getDate() + 1);
//             prevEnd.setHours(0, 0, 0, 0); // normalize to 00:00    
//             if (currStart.getTime() === prevEnd.getTime()) {
//                 finalWeekDataConcat = tabData.concat(excelData);
//                 return finalWeekDataConcat;
//             }
//             const getSortableMonth = dateVal => new Date(dateVal).toISOString().split("T")[0];
//             const indexInWeek = excelData.findIndex(el =>
//                 getSortableMonth(el.PERIODSTART_UTC) <= getSortableMonth(date) &&
//                 getSortableMonth(el.PERIODEND_UTC) >= getSortableMonth(date)
//             );
//             if (indexInWeek === -1) {
//                 const findTableMatch = tabData.findIndex(el => getSortableMonth(el.PERIODSTART_UTC) === getSortableMonth(excelData[0].PERIODSTART_UTC)
//                     && getSortableMonth(el.PERIODEND_UTC) === getSortableMonth(excelData[0].PERIODEND_UTC));
//                 if (findTableMatch != -1) {
//                     var weekTableSlicedData = tabData.slice(0, findTableMatch);
//                     finalWeekDataConcat = weekTableSlicedData.concat(excelData);
//                 }
//                 else {
//                     sap.ui.core.BusyIndicator.hide();
//                     sap.m.MessageToast.show("Monthly data doesn't have continuity. Please check again");
//                 }
//             }
//             else {
//                 var excelIndex = excelData.slice(indexInWeek + 1);
//                 var tabIndex = tabData.findIndex(el => getSortableMonth(el.PERIODSTART_UTC) === getSortableMonth(excelIndex[0].PERIODSTART_UTC)
//                     && getSortableMonth(el.PERIODEND_UTC) === getSortableMonth(excelIndex[0].PERIODEND_UTC))
//                 var tableData1 = tabData.slice(0, tabIndex);
//                 finalWeekDataConcat = tableData1.concat(excelIndex);

//             }

//             return finalWeekDataConcat;
//         },
//         finalQuarterData: function (tabData, excelData, date) {
//             var finalWeekDataConcat = [];
//             //check for continuation of uploadata
//             var lastTabData = tabData.at(-1);
//             const prevEnd = new Date(lastTabData.PERIODEND);
//             const currStart = new Date(excelData[0].PERIODSTART);
//             // Add 1 day to previous end
//             prevEnd.setDate(prevEnd.getDate() + 1);
//             prevEnd.setHours(0, 0, 0, 0); // normalize to 00:00    
//             if (currStart.getTime() === prevEnd.getTime()) {
//                 finalWeekDataConcat = tabData.concat(excelData);
//                 return finalWeekDataConcat;
//             }
//             const getSortableQrtr = dateVal => new Date(dateVal).toISOString().split("T")[0];
//             const indexInWeek = excelData.findIndex(el =>
//                 getSortableQrtr(el.PERIODSTART_UTC) <= getSortableQrtr(date) &&
//                 getSortableQrtr(el.PERIODEND_UTC) >= getSortableQrtr(date)
//             );
//             if (indexInWeek === -1) {
//                 const findTableMatch = tabData.findIndex(el => getSortableQrtr(el.PERIODSTART_UTC) === getSortableQrtr(excelData[0].PERIODSTART_UTC)
//                     && getSortableQrtr(el.PERIODEND_UTC) === getSortableQrtr(excelData[0].PERIODEND_UTC));
//                 if (findTableMatch != -1) {
//                     var weekTableSlicedData = tabData.slice(0, findTableMatch);
//                     finalWeekDataConcat = weekTableSlicedData.concat(excelData);
//                 }
//                 else {
//                     sap.ui.core.BusyIndicator.hide();
//                     sap.m.MessageToast.show("Quarterly data doesn't have continuity. Please check again");
//                 }
//             }
//             else {
//                 var excelIndex = excelData.slice(indexInWeek + 1);
//                 var tabIndex = tabData.findIndex(el => getSortableQrtr(el.PERIODSTART_UTC) === getSortableQrtr(excelIndex[0].PERIODSTART_UTC)
//                     && getSortableQrtr(el.PERIODEND_UTC) === getSortableQrtr(excelIndex[0].PERIODEND_UTC))
//                 var tableData1 = tabData.slice(0, tabIndex);
//                 finalWeekDataConcat = tableData1.concat(excelIndex);

//             }

//             return finalWeekDataConcat;
//         },
//         emptIBPCalenderWeek: function (data) {
//             const excelData = data;
//             // Split by TPLEVEL once
//             const getByLevel = (arr, level) => arr.filter(item => item.TPLEVEL === level);

//             const weekExcelData = getByLevel(excelData, 3);
//             const monthExcelData = getByLevel(excelData, 4);
//             const quarterExcelData = getByLevel(excelData, 5);

//             // Check date continuity
//             const weekUploadData = that.checkContinuousFlow(weekExcelData);
//             if (!weekUploadData) {
//                 sap.ui.core.BusyIndicator.hide();
//                 return sap.m.MessageToast.show("Discontinuity in week dates. Please re-upload correct file");
//             }

//             const monthUploadData = that.checkContinuousFlow(monthExcelData);
//             if (!monthUploadData) {
//                 sap.ui.core.BusyIndicator.hide();
//                 return sap.m.MessageToast.show("Discontinuity in month dates. Please re-upload correct file");
//             }

//             const quarterUploadData = that.checkContinuousFlow(quarterExcelData);
//             if (!quarterUploadData) {
//                 sap.ui.core.BusyIndicator.hide();
//                 return sap.m.MessageToast.show("Discontinuity in quarter dates. Please re-upload correct file");
//             }
//             //Check if uploaded data ends with same Period 
//             const lastFinalWeek = weekExcelData.at(-1);
//             const lastMonth = monthExcelData.at(-1);
//             const lastQuarter = quarterExcelData.at(-1);
//             const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];
//             // Compare last month with last week
//             const isMonthMatchingWeek = getSortableDate(new Date(lastFinalWeek.PERIODEND_UTC)) === getSortableDate(new Date(lastQuarter.PERIODEND_UTC));
//             if (!isMonthMatchingWeek) {
//                 sap.ui.core.BusyIndicator.hide();
//                 return sap.m.MessageToast.show("Quarter end doesn't match with weekly data");
//             }

//             // Compare last month with quarter range
//             const isMonthInQuarter =
//             getSortableDate(new Date(lastMonth.PERIODEND_UTC)) === getSortableDate(new Date(lastQuarter.PERIODEND_UTC));

//             if (!isMonthInQuarter) {
//                 sap.ui.core.BusyIndicator.hide();
//                 return sap.m.MessageToast.show("Quarter end doesn't match with monthly data");
//             }

//             var finalMergdeData = [...weekExcelData, ...monthExcelData, ...quarterExcelData];
//             //  finalMergdeData.forEach(obj => obj.PERIODID = Number(obj.PERIODID));
//             // Fix sequence
//             for (let i = 0; i < finalMergdeData.length; i++) {
//                 finalMergdeData[i].PERIODID = i + 1;
//             }
//             that.ibpCalenderWeek = finalMergdeData;
//             var lgTime = new Date().getTimezoneOffset();
//             finalMergdeData.forEach(el => {
//                 // // el.PERIODSTART_UTC = that.formattedDate(new Date(el.PERIODSTART).toLocaleString());
//                 // el.PERIODSTART_UTC = that.formattedDate(el.PERIODSTART);
//                 // // el.PERIODEND_UTC = that.formattedDate(new Date(el.PERIODEND).toLocaleString());
//                 // el.PERIODEND_UTC = that.formattedDate(el.PERIODEND);



//                 var start = new Date(el.PERIODSTART);
//                 var end = new Date(el.PERIODEND);

//                 el.PERIODSTART_UTC = new Date(start.setTime(start.getTime() - (lgTime * 60 * 1000)));
//                 el.PERIODEND_UTC = new Date(end.setTime(end.getTime() - (lgTime * 60 * 1000)));
//                 el.TPLEVEL = parseInt(el.TPLEVEL);
//             });
//             //Check for duplicate period desc
//             const periodDescMap = new Map();
//             finalMergdeData.forEach(obj => {
//                 const desc = obj.PERIODDESC;
//                 periodDescMap.set(desc, (periodDescMap.get(desc) || 0) + 1);
//             });
//             finalMergdeData = finalMergdeData.map(obj => {
//                 if (periodDescMap.get(obj.PERIODDESC) > 1) {
//                     that.Flag = "X";
//                     return { ...obj, ISDUPLICATEDESC: true };
//                 }
//                 return obj;
//             });
//             var newModel = new JSONModel();
//             newModel.setData({ results: finalMergdeData });
//             that.byId("idTabCM").setModel(newModel);
//             if (that.Flag === "X") {
//                 sap.m.MessageToast.show("Duplicates exists in Period Descriptions. Please recheck")
//                 that.byId("idSaveCM").setEnabled(false);
//             }
//             else {
//                 that.Flag = '';
//                 that.byId("idSaveCM").setEnabled(true);
//             }
//         },
//         compareArrays: function (arr1, arr2) {
//             if (arr1.length !== arr2.length) return false;

//             const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];

//             // Sort both arrays to ensure order doesn't affect comparison
//             const sorted1 = [...arr1].sort((a, b) =>
//                 getSortableDate(a.PERIODSTART_UTC).localeCompare(getSortableDate(b.PERIODSTART_UTC))
//             );
//             const sorted2 = [...arr2].sort((a, b) =>
//                 getSortableDate(a.PERIODSTART_UTC).localeCompare(getSortableDate(b.PERIODSTART_UTC))
//             );

//             for (let i = 0; i < sorted1.length; i++) {
//                 const a = sorted1[i];
//                 const b = sorted2[i];

//                 if (
//                     getSortableDate(a.PERIODSTART_UTC) !== getSortableDate(b.PERIODSTART_UTC) ||
//                     getSortableDate(a.PERIODEND_UTC) !== getSortableDate(b.PERIODEND_UTC) ||
//                     a.PERIODDESC !== b.PERIODDESC
//                 ) {
//                     return false;
//                 }
//             }
//             return true;
//         },
//         getDownloadData: function (data, date) {
//             var finalMergdeData=[];
//             var weekData = data.filter(el=>el.LEVEL === "W");
//             var monthData = data.filter(el=>el.LEVEL === "M");
//             var quarterData = data.filter(el=>el.LEVEL === "Q");
//             const getSortableMonth = dateVal => new Date(dateVal).toISOString().split("T")[0];


//             var qtrIndex = quarterData.findIndex(el=>getSortableMonth(el.PERIODSTART_UTC)<=getSortableMonth(date) &&
//             getSortableMonth(el.PERIODEND_UTC)>=getSortableMonth(date) );
//             var finalDownqtrData = quarterData.slice(qtrIndex+1);
//             if(finalDownqtrData.length>0){
//             var monthIndex = monthData.findIndex(el=>getSortableMonth(el.PERIODEND_UTC)===getSortableMonth(finalDownqtrData[0].PERIODEND_UTC));
//             var finalDownmonthData = monthData.slice(monthIndex);

//             var weekIndex = weekData.findIndex(el=>getSortableMonth(el.PERIODEND_UTC)===getSortableMonth(finalDownqtrData[0].PERIODEND_UTC));
//             var finalDownWeekData = weekData.slice(weekIndex);

//             finalMergdeData = [...finalDownWeekData,...finalDownmonthData,...finalDownqtrData];
//             finalMergdeData.forEach(el => {
//                 var start = new Date(el.PERIODSTART);
//                 var end = new Date(el.PERIODEND);
//                 el.PERIODSTART = getSortableMonth(start);
//                 el.PERIODEND = getSortableMonth(end);
//             });
//         }
//             return finalMergdeData;
//             // const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];
//             // const inputDate = getSortableDate(date);

//             // const getFilteredData = (level) => {
//             //     const filtered = data.filter(el => el.LEVEL === level);
//             //     const index = filtered.findIndex(el =>
//             //         getSortableDate(el.PERIODSTART_UTC) <= inputDate &&
//             //         getSortableDate(el.PERIODEND_UTC) >= inputDate
//             //     );
//             //     return filtered.slice(index);
//             // };

//             // const formatPeriodDates = (records) => {
//             //     return records.map(el => ({
//             //         ...el,
//             //         PERIODSTART: getSortableDate(el.PERIODSTART),
//             //         PERIODEND: getSortableDate(el.PERIODEND)
//             //     }));
//             // };

//             // const mergedData = [
//             //     ...getFilteredData("W"),
//             //     ...getFilteredData("M"),
//             //     ...getFilteredData("Q")
//             // ];

//             // return formatPeriodDates(mergedData);
//         },
//         onRefreshPress:function(){
//             this.getOwnerComponent().getModel("oModel").read("/getTelescopicData", {
//                 success: function (oData) {
//                     var data = (oData.results);
//                     var telescopicModel = new sap.ui.model.json.JSONModel({ results: data });
//                     that.byId("idTelescopicTabCM").setModel(telescopicModel);
//                 }
//             });
//         },
//         onTabSelected:function(oEvent){
//             var sSelectedKey = oEvent.getParameter("key");
//             var bShowFooter = (sSelectedKey === "Calendar"); // show only for first tab
//             this.getView().getModel("viewModel").setProperty("/showFooter", bShowFooter);
//         }
//     });
// });


// File: controller/Home.controller.js
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/formatter",
    "../utils/DateUtils",
    "../utils/ExcelUtils",
    "../utils/DataValidator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library",
    "sap/m/MessageToast"
], (Controller, formatter, DateUtils, ExcelUtils, DataValidator, JSONModel, Filter, FilterOperator, Spreadsheet, exportLibrary) => {
    "use strict";
    var that, oGModel;
    const EdmType = exportLibrary.EdmType;
    return Controller.extend("vcpapp.vcpibpcalendarmaintenance.controller.Home", {
        formatter: formatter,
        onInit() {
            that = this;
            that.oGModel = that.getOwnerComponent().getModel("oGModel");
            this._viewModel = new JSONModel({ showFooter: true });
            this.getView().setModel(this._viewModel, "viewModel");
            this._loadTelescopicValues();
            this._loadTelescopicData();
            this._loadCalendarWeek();
        },
        onAfterRendering:function(){
            this.saveFlag = "";
        },
        _loadTelescopicValues() {
            this.getOwnerComponent().getModel("oModel").callFunction("/getTelescopicValues", {
                success: (oData) => {
                    const data = JSON.parse(oData.getTelescopicValues);
                    if (data?.MaxFcharPlan != null) {
                        this.teleData = new Date(data.MaxFcharPlan);
                    }
                }
            });
        },

        _loadTelescopicData() {
            sap.ui.core.BusyIndicator.show();
            this.getOwnerComponent().getModel("oModel").read("/getTelescopicData", {
                success: (oData) => {
                    sap.ui.core.BusyIndicator.hide();
                    const telescopicModel = new JSONModel({ results: oData.results });
                    this.byId("idTelescopicTabCM").setModel(telescopicModel);
                },
                error:(e)=>{
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Failed to get telescopic data");
                }
            });
        },

        _loadCalendarWeek() {
            this.ibpCalenderWeek = [];
            this.Flag = "";
            this.descArray = [];
            sap.ui.core.BusyIndicator.show();
            this.getOwnerComponent().getModel("oModel").read("/getIBPCalenderWeek", {
                success: (oData) => {
                    const results = oData.results.map(el => {
                        el.TempID = parseInt(el.PERIODID);
                        el.PERIODSTART_UTC = new Date(el.PERIODSTART);
                        el.PERIODEND_UTC = new Date(el.PERIODEND);
                        const nextMondayStart = ExcelUtils.getNextMonday(el.PERIODSTART);
                        el.WEEK_START = nextMondayStart.toISOString().split("T")[0];
                    
                        // WEEK_END depends on LEVEL
                        if (el.LEVEL === "W") {
                            const sunday = ExcelUtils.addDays(nextMondayStart, 6);
                            el.WEEK_END = sunday.toISOString().split("T")[0];
                        } else if (el.LEVEL === "M" || el.LEVEL === "Q") {
                            const nextMondayEnd = ExcelUtils.getNextMonday(el.PERIODEND);
                            el.WEEK_END = nextMondayEnd.toISOString().split("T")[0];
                        }
                        this.descArray.push(el.PERIODDESC);
                        return el;
                    });

                    this.ibpCalenderWeek = results.sort((a, b) => parseInt(a.PERIODID) - parseInt(b.PERIODID));
                    that.oGModel.setProperty("/calendarData", this.ibpCalenderWeek);
                    this.byId("idTabCM").setModel(new JSONModel({ results: this.ibpCalenderWeek }));
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Failed to get VCP Calendar data");
                }
            });
        },

        onUpload1(e) {
            // this.saveFlag = "X";
            sap.ui.core.BusyIndicator.show();
            var calData = this.ibpCalenderWeek
            ExcelUtils.importExcel(e.getParameter("files")[0], this);
        },
        Emport(excelData) {
            var ibpCalendarData1 = that.oGModel.getProperty("/calendarData");
            const { data, hasDuplicates, isContinuous, message = "Periods are not continuous. Please correct and upload again." } = ExcelUtils.emport(excelData, new Date().getTimezoneOffset(), ibpCalendarData1, this.teleData);

            if (!isContinuous) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(message);
                return;
            }

            this.byId("idTabCM").setModel(new JSONModel({ results: data }));
            sap.m.MessageToast.show("Upload Successfull");
            this.ibpCalenderWeek = data;
            sap.ui.core.BusyIndicator.hide();
        },
        onSavePress() {
            
            sap.ui.core.BusyIndicator.show();
            const tableData = this.byId("idTabCM").getItems();
            const payload = ExcelUtils.buildPayloadFromTable(tableData, this);

            this.getOwnerComponent().getModel("oModel").callFunction("/updateCalenderWeek", {
                method: "GET",
                urlParameters: {
                    CalendarData: JSON.stringify(payload)
                },
                success: (oData) => {
                    const success = oData.updateCalenderWeek.includes("Successfully");
                    sap.m.MessageToast.show(success ? "Updated successfully" : "Updation failed");
                    if (success) {
                        this._loadCalendarWeek()
                        // this.onAfterRendering();
                        this.saveFlag = "Y";
                    };
                    sap.ui.core.BusyIndicator.hide();
                },
                error: () => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Error while updating");
                }
            });
        },

        onPeriodChange(oEvent) {
            const input = oEvent.getSource();
            const inputValue = input.getValue();
            const duplicates = this.byId("idTabCM").getItems().filter(row => row.getCells()[5].getValue() === inputValue);
            const isDuplicate = duplicates.length > 1;

            input.setValueState(isDuplicate ? "Error" : "None");
            input.setValueStateText(isDuplicate ? "Entry already exists" : "");
            this.byId("idSaveCM").setEnabled(!isDuplicate);
        },

        onPressBrowse(oEvent) {
            this.byId("FileUploaderCM").openFilePicker(oEvent);
        },

        oDownloadTemplate() {
            const sFileName = "VCP Calendar Template";
            const aCols = ExcelUtils.getExportColumns();
            const aDown = this.ibpCalenderWeek || [];
            const getISO = DateUtils.getISODate;
            var date = this.teleData;
            // const filteredData = this.ibpCalenderWeek.filter(el=>getISO(el.PERIODSTART_UTC) <= getISO(date) && 
            // getISO(el.PERIODEND_UTC) >= getISO(date) && el.LEVEL == 'Q');
            // if(filteredData.length>0){
            //     var downloadableData = this.ibpCalenderWeek.filter(el=> getISO(el.PERIODEND_UTC)>getISO(filteredData[0].PERIODEND_UTC));
            //      downloadableData.map(el => ({
            //         ...el,
            //         PERIODSTART: getISO(el.PERIODSTART),
            //         PERIODEND: getISO(el.PERIODEND)
            //     }));
            // }
            // else{
            //     var downloadableData=[];
            // }
            const downloadableData = ExcelUtils.getDownloadData(aDown, this.teleData);

            const oSheet = new Spreadsheet({
                workbook: { columns: aCols },
                dataSource: downloadableData,
                fileName: sFileName,
                worker: false
            });

            oSheet.build().finally(() => oSheet.destroy());
        },

        onTabSelected(oEvent) {
            const selectedKey = oEvent.getParameter("key");
            const showFooter = selectedKey === "Calendar";
            this._viewModel.setProperty("/showFooter", showFooter);
        },

        onRefreshPress() {
            this._loadTelescopicData();
        }
    });
});
