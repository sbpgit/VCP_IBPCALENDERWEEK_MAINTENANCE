sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    'sap/ui/export/Spreadsheet',
    "sap/ui/export/library"
], (Controller,Filter, FilterOperator, JSONModel, formatter,Spreadsheet,exportLibrary) => {
    "use strict";
    var that;
    var EdmType = exportLibrary.EdmType;
    return Controller.extend("vcpapp.vcpibpcalendarmaintenance.controller.Home", {
        formatter: formatter,
        onInit() {
            that = this;
            that.teleData = [];
            this.getOwnerComponent().getModel("oModel").callFunction("/getTelescopicValues", {
              success: function (oData) {
                var data = JSON.parse(oData.getTelescopicValues);
                that.teleData = new Date(data?.MaxFcharPlan);
              },
              error: function (e) {
      
              }
            })
          },
          onAfterRendering: function () {
            that.descArray = [];
            sap.ui.core.BusyIndicator.show();
            that.ibpCalenderWeek = [], that.Flag = '';
            var oFilters = [];
            oFilters.push(new Filter("LEVEL", FilterOperator.NE, null))
            this.getOwnerComponent().getModel("oModel").read("/getIBPCalenderWeek", {
              filters: [oFilters],
              success: function (oData) {
                if (oData.results.length > 0) {
                  oData.results.forEach(el => {
                    el.PERIODSTART_UTC = that.formattedDate(el.PERIODSTART);
                    el.PERIODEND_UTC = that.formattedDate(el.PERIODEND);
                    that.descArray.push(el.PERIODDESC);
                  });
                  that.ibpCalenderWeek = oData.results;
                  var newModel = new JSONModel();
                  newModel.setData({ results: oData.results });
                  that.byId("idTab").setModel(newModel);
                }
                else {
                  sap.m.MessageToast.show("No data available in IBP Calender week")
                }
                sap.ui.core.BusyIndicator.hide();
              },
              error: function (e) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Failed to get IBP Calender data")
              }
            })
          },
          formattedDate: function (date1) {
            const date = new Date(date1);
            // Convert to UTC components
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
      
            // Construct desired string with fixed time and nanoseconds
            const formattedDate = `${year}-${month}-${day}`;
            return formattedDate;
          },
          formattedDateStart: function (date1, flag) {
            const date = new Date(date1);
            // Convert to UTC components
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
      
            // Construct desired string with fixed time and nanoseconds
            if (flag == '') {
              let formattedDate = `${year}-${month}-${day} 00:00:00.000000000`;
              return formattedDate;
            }
            else {
              let formattedDate = `${year}-${month}-${day} 23:59:00.000000000`;
              return formattedDate;
            }
          },
          onUpload1: function (e) {
            sap.ui.core.BusyIndicator.show();
            this.importExcel(e.getParameter("files") && e.getParameter("files")[0]);
          },
          importExcel: function (file) {
            if (!file.type.endsWith("spreadsheetml.sheet") &&
              !file.type.endsWith("csv")) {
              return sap.m.MessageToast.show("Please upload only files of type XLSX");
            }
            sap.ui.core.BusyIndicator.show();
            var excelData = [];
            if (file && window.FileReader) {
              var reader = new FileReader();
              reader.onload = function (e) {
                var data = e.target.result;
                var workbook = XLSX.read(data, {
                  type: 'binary'
                });
                workbook.SheetNames.forEach(function (sheetName) {
                  // Here is your object for every sheet in workbook
                  excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                  if (excelData.length > 0) {
                    that.Emport(excelData);
                  }
                });
              }
              reader.onerror = function (ex) {
                sap.ui.core.BusyIndicator.hide();
                console.log(ex);
      
              };
              reader.readAsBinaryString(file);
      
            }
          },
          Emport: function (array) {
            var data = array.sort((a, b) => a.TPLEVEL - b.TPLEVEL);
            var endDate = that.teleData;
            if (endDate != undefined) {
              var indexinArray = data.findIndex(el => new Date(el.PERIODSTART) <= new Date(endDate) && new Date(el.PERIODEND) >= new Date(endDate));
              if (indexinArray != -1) {
                var remainingData = data.slice(indexinArray + 1);
                remainingData.forEach(el => {
                  el.PERIODSTART_UTC = that.formattedDate(el.PERIODSTART);
                  el.PERIODEND_UTC = that.formattedDate(el.PERIODEND);
                  el.TPLEVEL = parseInt(el.TPLEVEL);
                });
                var tableData = that.ibpCalenderWeek;
                var removeAfterDataIndex = tableData.findIndex(el => el.TPLEVEL === remainingData[0].TPLEVEL && el.LEVEL == remainingData[0].LEVEL &&
                  new Date(el.PERIODSTART_UTC) <= new Date(remainingData[0].PERIODSTART_UTC)
                  && new Date(el.PERIODEND_UTC) >= new Date(remainingData[0].PERIODSTART_UTC));
                var remainingMainData = tableData.slice(0, removeAfterDataIndex + 1);
                var finalArrayWithoutConflicts = that.mergeWithoutConflicts(remainingMainData, remainingData);
                that.descArray = [];
                finalArrayWithoutConflicts.forEach(el => that.descArray.push(el.PERIODDESC));
                var newModel = new JSONModel();
                newModel.setData({ results: finalArrayWithoutConflicts });
                that.byId("idTab").setModel(newModel);
              }
              if (that.Flag == "X") {
                sap.m.MessageToast.show("Duplicates exists in Period Descriptions. Please recheck")
                that.byId("idSave").setEnabled(false);
              }
              else {
                that.Flag = '';
                that.byId("idSave").setEnabled(true);
              }
            }
            else {
              data.forEach(el => {
                el.PERIODSTART_UTC = that.formattedDate(el.PERIODSTART);
                el.PERIODEND_UTC = that.formattedDate(el.PERIODEND);
                el.TPLEVEL = parseInt(el.TPLEVEL);
              });
              //Check for duplicate period desc
              const periodDescMap = new Map();
              data.forEach(obj => {
                const desc = obj.PERIODDESC;
                periodDescMap.set(desc, (periodDescMap.get(desc) || 0) + 1);
              });
              data = data.map(obj => {
                if (periodDescMap.get(obj.PERIODDESC) > 1) {
                  that.Flag = "X";
                  return { ...obj, ISDUPLICATEDESC: true };
                }
                return obj;
              });
              var newModel = new JSONModel();
              newModel.setData({ results: data });
              that.byId("idTab").setModel(newModel);
              if (that.Flag == "X") {
                sap.m.MessageToast.show("Duplicates exists in Period Descriptions. Please recheck")
                that.byId("idSave").setEnabled(false);
              }
              else {
                that.Flag = '';
                that.byId("idSave").setEnabled(true);
              }
            }
            sap.ui.core.BusyIndicator.hide();
          },
          mergeWithoutConflicts: function (array1, array2) {
            // Step 1: Create Sets for conflict detection
            const startSet = new Set(array1.map(obj => `${obj.TPLEVEL}-${new Date(obj.PERIODSTART_UTC)}`));
            const endSet = new Set(array1.map(obj => `${obj.TPLEVEL}-${new Date(obj.PERIODEND_UTC)}`));
      
            // Step 2: Exclude conflicting items from array2
            const nonConflictingArray2 = array2.filter(obj => {
              const startKey = `${obj.TPLEVEL}-${new Date(obj.PERIODSTART_UTC)}`;
              const endKey = `${obj.TPLEVEL}-${new Date(obj.PERIODEND_UTC)}`;
              return !startSet.has(startKey) && !endSet.has(endKey);
            });
      
            // Step 3: Merge array1 with non-conflicting items from array2
            const merged = [...array1, ...nonConflictingArray2];
            // Step 4: Count PERIODDESC occurrences
            const periodDescMap = new Map();
            merged.forEach(obj => {
              const desc = obj.PERIODDESC;
              periodDescMap.set(desc, (periodDescMap.get(desc) || 0) + 1);
            });
      
            // Step 5: Add ISDUPLICATEDESC if PERIODDESC appears more than once
            const final = merged.map(obj => {
              if (periodDescMap.get(obj.PERIODDESC) > 1) {
                that.Flag = "X";
                return { ...obj, ISDUPLICATEDESC: true };
              }
              return obj;
            });
            return final;
          },
          //Function to save entries into IBP calender
          onSavePress: function () {
            sap.ui.core.BusyIndicator.show();
            var tableData = that.byId("idTab").getItems();
            var final = {}, finalArray = [];
            tableData.forEach(el => {
              if(el.getCells()[7].getText() == ''){
                 var monthWeight = null;
              }
              else{
                var monthWeight = el.getCells()[7].getText();
              }
              final.TPLEVEL = parseInt(el.getCells()[0].getText()),
                final.PERIODID = el.getCells()[2].getText(),
                final.LEVEL = el.getCells()[1].getText().replace(/(\S)\s+/g, "$1"),
                final.PERIODSTART = that.formattedDateStart(el.getCells()[3].getText(), ''),
                final.PERIODEND = that.formattedDateStart(el.getCells()[4].getText(), 'X'),
                final.PERIODDESC = el.getCells()[5].getValue(),
                final.MONTHWEIGHT = monthWeight,
                final.WEEKWEIGHT = null,
                final.WEEK_STARTDATE = null,
                final.WEEK_ENDDATE = null,
                finalArray.push(final);
              final = {};
            })
            this.getOwnerComponent().getModel("oModel").callFunction("/updateCalenderWeek", {
              method: "GET",
              urlParameters: {
                CalendarData: JSON.stringify(finalArray)
              },
              success: function (oData) {
                if (oData.updateCalenderWeek.includes("Successfully")) {
                  sap.m.MessageToast.show("Updated successfully");
                }
                else {
                  sap.m.MessageToast.show("Updation failed")
                }
                sap.ui.core.BusyIndicator.hide();
              },
              error: function (e) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Error while updating");
              }
            })
          },
          //Live Change of input
          onPeriodChange: function (oEvent) {
            var input = oEvent.getSource();
            var inputValue = input.getValue();
            const indexes = [];
            that.byId("idTab").getItems().forEach((value, index) => {
              if (value.getCells()[5].getValue() === inputValue) {
                indexes.push(index);
              }
            });
            if (indexes.length > 1) {
              input.setValueState("Error");
              input.setValueStateText("Entry already exists");
              that.byId("idSave").setEnabled(false);
            }
            else {
              input.setValueState("None");
              that.byId("idSave").setEnabled(true);
            }
          },
          onPressBrowse:function(oEvent){
            that.byId("FileUploader").openFilePicker(oEvent);
          },
          //download excel template
          oDownloadTemplate:function(){
            var aDown = that.ibpCalenderWeek;
            var oSettings, oSheet;
            var sFileName = "IBP Calender Template";
            var aCols = []
            if(aDown.length){
                      for (var j = 0; j < Object.keys(aDown[0]).length; j++) {
                          aCols.push({
                              property: Object.keys(aDown[0])[j],
                              type: EdmType.String,
                              label: Object.keys(aDown[0])[j]
                          });
                      }
                    }
                      var oSettings = {
                          workbook: {
                              columns: aCols
                          },
                          dataSource: [],
                          fileName: sFileName,
                          worker: false
                      };
                      var oSheet = new Spreadsheet(oSettings);
                      oSheet.build().finally(function () {
                          oSheet.destroy();
                      });
          }
        });
      });