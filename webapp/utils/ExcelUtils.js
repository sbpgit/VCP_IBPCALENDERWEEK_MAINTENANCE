sap.ui.define(["sap/m/MessageToast", "sap/ui/model/json/JSONModel", "./DateUtils"], function (MessageToast, JSONModel, DateUtils) {
    "use strict";

    let uploadFlag = "";

    return {
        importExcel(file, context) {
            if (!file || (!file.type.endsWith("spreadsheetml.sheet") && !file.type.endsWith("csv"))) {
                return MessageToast.show("Please upload only files of type XLSX or CSV");
            }

            uploadFlag = "X";
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                workbook.SheetNames.forEach(function (sheetName) {
                    const excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                    if (excelData.length > 0) {
                        const timezoneOffset = new Date().getTimezoneOffset();
                        const ibpCalendarData = context.ibpCalenderWeek || [];
                        const result = context.emport(excelData, timezoneOffset, ibpCalendarData);

                        context.byId("idTab").setModel(new JSONModel({ results: result.data }));
                        context.ibpCalenderWeek = result.data;

                        if (!result.isContinuous) {
                            MessageToast.show(result.validationError || "Periods are not continuous. Please correct and upload again.");
                            return;
                        }
                        
                        if (result.hasDuplicates) {
                            MessageToast.show("Duplicates found and merged successfully.");
                        }
                    } else {
                        sap.ui.core.BusyIndicator.hide();
                        if (uploadFlag !== "X") {
                            MessageToast.show("No data available in the uploaded file");
                        }
                        uploadFlag = '';
                    }
                });
            };

            reader.onerror = function (ex) {
                sap.ui.core.BusyIndicator.hide();
                console.error("File reading error:", ex);
            };

            reader.readAsBinaryString(file);
        },

        emport(array, timezoneOffset, ibpCalendarData) {
            uploadFlag = "X";
            
            // ibpCalendarData contains existing calendar data from context.ibpCalenderWeek
            // It's only empty on the very first upload, otherwise contains existing periods
            const existingData = ibpCalendarData || [];

            try {
                // Step 1: Transform and deduplicate input data
                const transformedData = this.transformInputData(array, timezoneOffset);
                
                // Step 2: Merge with existing IBP calendar data
                const mergedData = this.mergeWithIBPCalendarData(transformedData, existingData);
                
                // Step 3: Handle duplicates and create final dataset
                const finalData = this.handleDuplicatesAndFinalize(mergedData);
                
                // Step 4: Validate continuity and period alignment
                const validationResult = this.validateContinuityAndAlignment(finalData.data);
                
                return {
                    data: finalData.data,
                    hasDuplicates: finalData.hasDuplicates,
                    isContinuous: validationResult.isContinuous,
                    validationError: validationResult.error
                };
            } catch (error) {
                console.error("Error in emport function:", error);
                return {
                    data: [],
                    hasDuplicates: false,
                    isContinuous: false
                };
            }
        },

        transformInputData(array, timezoneOffset) {
            const levelMap = { W: 3, M: 4, Q: 5 };
            const uniqueMap = new Map();
            let periodIdCounter = 1;

            return array.reduce((result, el) => {
                // Create unique key for deduplication
                const key = `${el.LEVEL}_${el.PERIODSTART}_${el.PERIODEND}`;
                
                if (!uniqueMap.has(key) && levelMap[el.LEVEL]) {
                    uniqueMap.set(key, true);
                    
                    const start = new Date(el.PERIODSTART);
                    const end = new Date(el.PERIODEND);
                    
                    result.push({
                        ...el,
                        PERIODID: (periodIdCounter++).toString().padStart(3, '0'),
                        TPLEVEL: levelMap[el.LEVEL],
                        PERIODSTART_UTC: new Date(start.getTime() - timezoneOffset * 60 * 1000),
                        PERIODEND_UTC: new Date(end.getTime() - timezoneOffset * 60 * 1000),
                        WEEKWEIGHT: el.WEEKWEIGHT || 7,
                        MONTHWEIGHT: el.MONTHWEIGHT || null,
                        SOURCE: 'UPLOAD' // Mark as uploaded data
                    });
                }
                
                return result;
            }, []);
        },

        mergeWithIBPCalendarData(newData, ibpCalendarData) {
            // If no existing IBP calendar data (first upload), return new data only
            if (!ibpCalendarData || ibpCalendarData.length === 0) {
                return newData.map(item => ({ ...item, SOURCE: 'UPLOAD' }));
            }

            // Mark existing data for identification
            const markedIBPData = ibpCalendarData.map(item => ({
                ...item,
                SOURCE: item.SOURCE || 'IBP'
            }));

            // Combine both datasets
            const combinedData = [...markedIBPData, ...newData];
            
            // Sort by TPLEVEL and PERIODSTART for consistent ordering
            return combinedData.sort((a, b) => {
                if (a.TPLEVEL !== b.TPLEVEL) {
                    return a.TPLEVEL - b.TPLEVEL;
                }
                return new Date(a.PERIODSTART) - new Date(b.PERIODSTART);
            });
        },

        handleDuplicatesAndFinalize(mergedData) {
            // Group by unique period identifier
            const periodGroups = new Map();
            let hasDuplicates = false;

            mergedData.forEach(item => {
                const key = `${item.LEVEL}_${item.PERIODSTART}_${item.PERIODEND}`;
                
                if (!periodGroups.has(key)) {
                    periodGroups.set(key, []);
                }
                periodGroups.get(key).push(item);
            });

            // Process each group and merge duplicates
            const finalData = [];
            let periodIdCounter = 1;

            Array.from(periodGroups.entries()).forEach(([key, group]) => {
                if (group.length > 1) {
                    hasDuplicates = true;
                    // Merge duplicates
                    const mergedItem = this.mergeDuplicateItems(group);
                    mergedItem.PERIODID = (periodIdCounter++).toString().padStart(3, '0');
                    finalData.push(mergedItem);
                } else {
                    // Single item, update PERIODID
                    const item = { ...group[0] };
                    item.PERIODID = (periodIdCounter++).toString().padStart(3, '0');
                    finalData.push(item);
                }
            });

            // Final sort by TPLEVEL and PERIODSTART
            finalData.sort((a, b) => {
                if (a.TPLEVEL !== b.TPLEVEL) {
                    return a.TPLEVEL - b.TPLEVEL;
                }
                return new Date(a.PERIODSTART) - new Date(b.PERIODSTART);
            });

            return {
                data: finalData,
                hasDuplicates: hasDuplicates
            };
        },

        mergeDuplicateItems(duplicateItems) {
            // Sort by priority: UPLOAD data takes precedence over IBP data
            const sortedItems = duplicateItems.sort((a, b) => {
                if (a.SOURCE === 'UPLOAD' && b.SOURCE !== 'UPLOAD') return -1;
                if (a.SOURCE !== 'UPLOAD' && b.SOURCE === 'UPLOAD') return 1;
                return 0;
            });

            const baseItem = { ...sortedItems[0] };
            
            // Merge PERIODDESC as array if there are different descriptions
            const descriptions = [...new Set(
                duplicateItems
                    .map(item => item.PERIODDESC)
                    .filter(desc => desc && desc.trim())
            )];
            
            if (descriptions.length > 1) {
                baseItem.PERIODDESC = descriptions;
                baseItem.ISDUPLICATEDESC = true;
            } else {
                baseItem.PERIODDESC = descriptions[0] || baseItem.PERIODDESC;
                baseItem.ISDUPLICATEDESC = false;
            }

            // Merge other relevant fields (prefer non-null values)
            baseItem.WEEKWEIGHT = this.selectBestValue(duplicateItems, 'WEEKWEIGHT') || 7;
            baseItem.MONTHWEIGHT = this.selectBestValue(duplicateItems, 'MONTHWEIGHT');
            
            // Keep track of sources
            baseItem.MERGED_SOURCES = [...new Set(duplicateItems.map(item => item.SOURCE))];
            
            return baseItem;
        },

        selectBestValue(items, field) {
            // Return the first non-null, non-undefined value
            for (const item of items) {
                if (item[field] != null && item[field] !== '') {
                    return item[field];
                }
            }
            return null;
        },

        validateContinuityAndAlignment(data) {
            const levelGroups = {
                W: data.filter(el => el.LEVEL === 'W'),
                M: data.filter(el => el.LEVEL === 'M'),
                Q: data.filter(el => el.LEVEL === 'Q')
            };

            // Check continuity within each level
            for (const [level, group] of Object.entries(levelGroups)) {
                if (group.length <= 1) continue;
                
                for (let i = 1; i < group.length; i++) {
                    const prevEnd = new Date(group[i - 1].PERIODEND);
                    const currStart = new Date(group[i].PERIODSTART);
                    
                    const expectedStart = new Date(prevEnd);
                    expectedStart.setDate(expectedStart.getDate() + 1);
                    expectedStart.setHours(0, 0, 0, 0);
                    
                    const actualStart = new Date(currStart);
                    actualStart.setHours(0, 0, 0, 0);
                    
                    if (actualStart.getTime() !== expectedStart.getTime()) {
                        const levelName = level === 'W' ? 'week' : level === 'M' ? 'month' : 'quarter';
                        return {
                            isContinuous: false,
                            error: `Discontinuity in ${levelName} dates. Please re-upload correct file`
                        };
                    }
                }
            }

            // Check period alignment: Week, Month, Quarter start & end dates should match
            if (levelGroups.W.length > 0 && levelGroups.M.length > 0 && levelGroups.Q.length > 0) {
                const firstWeek = levelGroups.W[0];
                const firstMonth = levelGroups.M[0];
                const firstQuarter = levelGroups.Q[0];
                
                const lastWeek = levelGroups.W.at(-1);
                const lastMonth = levelGroups.M.at(-1);
                const lastQuarter = levelGroups.Q.at(-1);
                
                const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];
                
                // Check if first periods start on the same date
                const weekStartDate = getSortableDate(new Date(firstWeek.PERIODSTART_UTC || firstWeek.PERIODSTART));
                const monthStartDate = getSortableDate(new Date(firstMonth.PERIODSTART_UTC || firstMonth.PERIODSTART));
                const quarterStartDate = getSortableDate(new Date(firstQuarter.PERIODSTART_UTC || firstQuarter.PERIODSTART));
                
                if (weekStartDate !== quarterStartDate || monthStartDate !== quarterStartDate) {
                    return {
                        isContinuous: false,
                        error: "PERIODSTART dates doesn't match"
                    };
                }
                
                // Check if last periods end on the same date
                const weekEndDate = getSortableDate(new Date(lastWeek.PERIODEND_UTC || lastWeek.PERIODEND));
                const monthEndDate = getSortableDate(new Date(lastMonth.PERIODEND_UTC || lastMonth.PERIODEND));
                const quarterEndDate = getSortableDate(new Date(lastQuarter.PERIODEND_UTC || lastQuarter.PERIODEND));
                
                // Compare last week with last quarter
                if (weekEndDate !== quarterEndDate) {
                    return {
                        isContinuous: false,
                        error: "Quarter end doesn't match with weekly data"
                    };
                }
                
                // Compare last month with last quarter
                if (monthEndDate !== quarterEndDate) {
                    return {
                        isContinuous: false,
                        error: "Quarter end doesn't match with monthly data"
                    };
                }
            }

            return {
                isContinuous: true,
                error: null
            };
        },

        buildPayloadFromTable(tableData, context) {
            const levelMap = { Week: 'W', Month: 'M', Quarter: 'Q' };
            
            return tableData.map(el => {
                const cells = el.getCells();
                const levelText = cells[1].getText().replace(/\s+/g, "");
                const level = levelMap[levelText] || "";

                return {
                    TPLEVEL: parseInt(cells[0].getText()) || 0,
                    PERIODID: cells[2].getText(),
                    LEVEL: level,
                    PERIODSTART: DateUtils.formattedDateStart(cells[3].getText(), ''),
                    PERIODEND: DateUtils.formattedDateStart(cells[4].getText(), 'X'),
                    PERIODDESC: cells[5].getValue(),
                    MONTHWEIGHT: cells[7].getText() ? parseInt(cells[7].getText()) : null,
                    WEEKWEIGHT: 7,
                    WEEK_STARTDATE: cells[8].getText(),
                    WEEK_ENDDATE: cells[9].getText()
                };
            });
        },

        getExportColumns() {
            const keys = ['LEVEL', 'PERIODSTART', 'PERIODEND', 'PERIODDESC', 'WEEKWEIGHT', 'MONTHWEIGHT'];
            return keys.map(key => ({
                property: key,
                type: "Edm.String",
                label: key
            }));
        },

        getDownloadData(data, date) {
            const getISO = DateUtils.getISODate;
            const [weekData, monthData, quarterData] = ['W', 'M', 'Q'].map(level => 
                data.filter(el => el.LEVEL === level)
            );

            const qtrIndex = quarterData.findIndex(el => 
                getISO(el.PERIODSTART_UTC) <= getISO(date) && 
                getISO(el.PERIODEND_UTC) >= getISO(date)
            );
            
            const finalDownqtrData = quarterData.slice(qtrIndex + 1);
            if (!finalDownqtrData.length) return [];

            // const firstQuarterEnd = getISO(finalDownqtrData[0].PERIODEND_UTC);
            // const monthIndex = monthData.findIndex(el => getISO(el.PERIODEND_UTC) === firstQuarterEnd);
            // const weekIndex = weekData.findIndex(el => getISO(el.PERIODEND_UTC) === firstQuarterEnd);

            // const finalData = [
            //     ...weekData.slice(weekIndex),
            //     ...monthData.slice(monthIndex),
            //     ...finalDownqtrData
            // ];

             const firstQuarterStart = getISO(finalDownqtrData[0].PERIODSTART_UTC);
            const monthIndex = monthData.findIndex(el => getISO(el.PERIODSTART_UTC) === firstQuarterStart);
            const weekIndex = weekData.findIndex(el => getISO(el.PERIODSTART_UTC) === firstQuarterStart);

            const finalData = [
                ...weekData.slice(weekIndex),
                ...monthData.slice(monthIndex),
                ...finalDownqtrData
            ];

            return finalData.map(el => ({
                ...el,
                PERIODSTART: getISO(el.PERIODSTART),
                PERIODEND: getISO(el.PERIODEND)
            }));
        }
    };
});