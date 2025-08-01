sap.ui.define(["sap/m/MessageToast", "sap/ui/model/json/JSONModel", "./DateUtils"], function (MessageToast, JSONModel, DateUtils) {
    "use strict";

    let uploadFlag = "";

    return {
        importExcel(file, context) {
            if (!file || (!file.type.endsWith("spreadsheetml.sheet") && !file.type.endsWith("csv"))) {
                return MessageToast.show("Please upload only files of type XLSX or CSV");
            }

            const reader = new FileReader();

            reader.onload = function (e) {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                workbook.SheetNames.forEach(function (sheetName) {
                    const excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                    if (excelData.length > 0) {
                        const timezoneOffset = new Date().getTimezoneOffset();
                        const ibpCalendarData = context.ibpCalenderWeek || [];
                            context.Emport(excelData, timezoneOffset, ibpCalendarData);
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

        emport(array, timezoneOffset, ibpCalendarData, plannedDate) {
            uploadFlag = "X";
            return this.export(array, timezoneOffset,ibpCalendarData, plannedDate);
           
        },
        export(array, timezoneOffset, ibpCalendarData, plannedDate){

            // ibpCalendarData contains existing calendar data from context.ibpCalenderWeek
            // It's only empty on the very first upload, otherwise contains existing periods
            const existingData = ibpCalendarData || [];
            const self = this;
            try {
                // Step 1: Transform and deduplicate input data
                const transformedData = this.transformInputData(array, timezoneOffset, plannedDate);
                if (existingData.length > 0) {
                    var sameData = self.compareArrays(existingData, transformedData);
                    if (sameData) {
                        sap.ui.core.BusyIndicator.hide();
                        return sap.m.MessageToast.show("Same file uploaded");
                    }
                }
                // Step 2: Merge with existing IBP calendar data
                const mergedData = this.mergeWithIBPCalendarData(transformedData, existingData, plannedDate);
                if (mergedData.length == 0) {
                    return {
                        data: [],
                        hasDuplicates: false,
                        isContinuous: false,
                        message: mergedData.message
                    };
                }

                // Step 3: Handle duplicates and create final dataset
                const finalData = this.handleDuplicatesAndFinalize(mergedData);

                // Step 4: Validate continuity and period alignment
                const validationResult = this.validateContinuityAndAlignment(finalData.data);

                return {
                    data: finalData.data,
                    hasDuplicates: finalData.hasDuplicates,
                    isContinuous: validationResult.isContinuous,
                    message: validationResult.message
                };
            } catch (error) {
                console.log("Error in emport function:", error);
                return {
                    data: [],
                    hasDuplicates: false,
                    isContinuous: false,
                    message: error
                };
            }
        },

        transformInputData(array, timezoneOffset, plannedDate) {
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

                    const nextMondayStart = this.getNextMonday(new Date(start.getTime() - timezoneOffset * 60 * 1000));
                    el.WEEK_START = nextMondayStart.toISOString().split("T")[0];
                    // WEEK_END depends on LEVEL
                    if (el.LEVEL === "W") {
                        const sunday = this.addDays(nextMondayStart, 6);
                        el.WEEK_END = sunday.toISOString().split("T")[0];
                    } else if (el.LEVEL === "M" || el.LEVEL === "Q") {
                        const adjustedEnd = new Date(end.getTime() - timezoneOffset * 60 * 1000);
                        const nextSundayEnd = this.getNextSunday(adjustedEnd);
                        el.WEEK_END = nextSundayEnd.toISOString().split("T")[0];
                    }

                    result.push({
                        ...el,
                        PERIODID: (periodIdCounter++).toString().padStart(3, '0'),
                        TPLEVEL: levelMap[el.LEVEL],
                        PERIODSTART_UTC: new Date(start.getTime() - timezoneOffset * 60 * 1000),
                        PERIODEND_UTC: new Date(end.getTime() - timezoneOffset * 60 * 1000),
                        WEEKWEIGHT: null,
                        MONTHWEIGHT: (el.MONTHWEIGHT || null),
                        SOURCE: 'UPLOAD' // Mark as uploaded data
                    });
                }
                
                return result;
            }, []);
        },


        mergeWithIBPCalendarData(newData, ibpCalendarData, plannedDate) {
            const result = [];
            newData.sort((a, b) => a.TPLEVEL - b.TPLEVEL || new Date(a.PERIODSTART) - new Date(b.PERIODSTART));
            if (!ibpCalendarData || ibpCalendarData.length === 0) {
                return newData.map(item => ({ ...item, SOURCE: 'UPLOAD' }));
            }

            const getISO = DateUtils.getISODate;
            const getExcelDate = DateUtils.getExcelDate;
            // Step 1: Identify cutoff date from quarterly level
            let cutoffDate;
            const arrayItemExcel = newData.filter(el =>
                getExcelDate(el.PERIODSTART) <= getISO(plannedDate) &&
                getExcelDate(el.PERIODEND) >= getISO(plannedDate) &&
                el.LEVEL === "Q"
            );
            const arrayItemCalendar = ibpCalendarData.filter(el =>
                getISO(el.PERIODSTART) <= getISO(plannedDate) &&
                getISO(el.PERIODEND) >= getISO(plannedDate) &&
                el.LEVEL === "Q"
            );
            //case 1 : If planning data exists in both files
            if (arrayItemExcel.length > 0 && arrayItemCalendar.length > 0) {
                cutoffDate = new Date(arrayItemExcel[0].PERIODEND); // Use Date directly, not getISO
                newData = newData.filter(el => new Date(el.PERIODEND) > cutoffDate);
                ibpCalendarData = ibpCalendarData.filter(el => new Date(el.PERIODEND) <= cutoffDate);
            }
            //case 2: Planning data exists only in Excel file & not in calendar data
            else if (arrayItemExcel.length > 0 && arrayItemCalendar.length == 0) {
                const startExcelDate = newData[0];
                const finalCalendarDate = ibpCalendarData.at(-1);
                const findIndex = newData.findIndex(el => new Date(el.PERIODEND) == new Date(finalCalendarDate.PERIODEND));
                if (findIndex != -1) {
                    newData = newData.filter(el=> new Date(el.PERIODEND) > new Date(finalCalendarDate.PERIODEND));
                    // newData = newData.filter(findIndex + 1);
                }
                else {
                    //check if excel data is a continuity of calendar data
                    const prevEnd = getISO(new Date(finalCalendarDate.PERIODEND));
                    const currStart = getExcelDate(startExcelDate.PERIODSTART);

                    const expectedStart = new Date(prevEnd);
                    expectedStart.setDate(expectedStart.getDate() + 1);
                    expectedStart.setHours(0, 0, 0, 0);

                    const actualStart = new Date(currStart);
                    actualStart.setHours(0, 0, 0, 0);

                    if (actualStart.getTime() !== expectedStart.getTime()) {
                        result.data = [];
                        result.message = "Uploaded data is not continuous with the existing calendar data.";
                        return result;
                    }
                }
            }
            //case 3: Planning data exists only in calendar data & not in Excel file 
            else if (arrayItemExcel.length == 0 && arrayItemCalendar.length > 0) {
                const startExcelDate = newData[0];
                const endExcelDate = newData.at(-1);
                if (getExcelDate(endExcelDate.PERIODEND) < getISO(plannedDate)) {
                    result.data = [];
                    result.message = "Uploaded data includes dates marked for pre-planning only. Modifications are not permitted.";
                    return result;
                }
                const findIndex = ibpCalendarData.findIndex(el => getISO(new Date(el.PERIODEND)) == getExcelDate(startExcelDate.PERIODEND));
                if (findIndex != -1) {
                    // ibpCalendarData = ibpCalendarData.slice(0, findIndex);
                    ibpCalendarData = ibpCalendarData.filter(el=> getISO(new Date(el.PERIODEND)) < getExcelDate(startExcelDate.PERIODEND));
                }
                else {
                    //check if excel data is a continuity of calendar data
                    const prevEnd = getISO(new Date(ibpCalendarData.at(-1).PERIODEND));
                    const currStart = getExcelDate(startExcelDate.PERIODSTART);

                    const expectedStart = new Date(prevEnd);
                    expectedStart.setDate(expectedStart.getDate() + 1);
                    expectedStart.setHours(0, 0, 0, 0);

                    const actualStart = new Date(currStart);
                    actualStart.setHours(0, 0, 0, 0);

                    if (actualStart.getTime() !== expectedStart.getTime()) {
                        result.data = [];
                        result.message = "Uploaded data is not continuous with the existing calendar data.";
                        return result;
                    }
                }
            }
            //case 4: Planning data doesn't exists in both files 
            else if (arrayItemExcel.length == 0 && arrayItemCalendar.length == 0) {
                const endCalDate = ibpCalendarData.at(-1);
                const startExcelDate = newData[0];
                const findIndex = newData.findIndex(el => getExcelDate(el.PERIODEND) == getISO(new Date(endCalDate.PERIODEND)));
                if (findIndex != -1) {
                    // newData = newData.slice(findIndex + 1);
                    newData=newData.filter(el => getExcelDate(el.PERIODEND) > getISO(new Date(endCalDate.PERIODEND)));
                }
                else {
                    //check if excel data is a continuity of calendar data
                    const prevEnd = getISO(new Date(endCalDate.PERIODEND));
                    const currStart = getExcelDate(startExcelDate.PERIODSTART);

                    const expectedStart = new Date(prevEnd);
                    expectedStart.setDate(expectedStart.getDate() + 1);
                    expectedStart.setHours(0, 0, 0, 0);

                    const actualStart = new Date(currStart);
                    actualStart.setHours(0, 0, 0, 0);

                    if (actualStart.getTime() !== expectedStart.getTime()) {
                        result.data = [];
                        result.message = "Uploaded data is not continuous with the existing calendar data.";
                        return result;
                    }
                }
            }

            // Step 2: Group by LEVEL
            const levels = ['W', 'M', 'Q'];
            const existingLevelData = ibpCalendarData.map(item => ({
                ...item,
                SOURCE: 'IBP'
            }));
            const newLevelData = newData.map(item => ({ ...item, SOURCE: 'UPLOAD' }));
            result.push(...existingLevelData, ...newLevelData);

            // Step 3: Sort by TPLEVEL, then PERIODSTART
            return result.sort((a, b) => {
                if (a.TPLEVEL !== b.TPLEVEL) return a.TPLEVEL - b.TPLEVEL;
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
            const getISO = DateUtils.getISODate;
            const levelGroups = {
                W: data.filter(el => el.LEVEL === 'W'),
                M: data.filter(el => el.LEVEL === 'M'),
                Q: data.filter(el => el.LEVEL === 'Q')
            };

            // Check continuity within each level
            for (const [level, group] of Object.entries(levelGroups)) {
                if (group.length <= 1) continue;

                for (let i = 1; i < group.length; i++) {
                    const prevEnd = getISO(new Date(group[i - 1].PERIODEND_UTC));
                    const currStart = getISO(new Date(group[i].PERIODSTART_UTC));

                    const expectedStart = new Date(prevEnd);
                    expectedStart.setDate(expectedStart.getDate() + 1);
                    expectedStart.setHours(0, 0, 0, 0);

                    const actualStart = new Date(currStart);
                    actualStart.setHours(0, 0, 0, 0);

                    if (actualStart.getTime() !== expectedStart.getTime()) {
                        const levelName = level === 'W' ? 'week' : level === 'M' ? 'month' : 'quarter';
                        return {
                            isContinuous: false,
                            message: `Discontinuity in ${levelName} dates. Please re-upload correct file`
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
                        message: "PERIODSTART dates doesn't match"
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
                        message: "Quarter end doesn't match with weekly data"
                    };
                }

                // Compare last month with last quarter
                if (monthEndDate !== quarterEndDate) {
                    return {
                        isContinuous: false,
                        message: "Quarter end doesn't match with monthly data"
                    };
                }
            }

            return {
                isContinuous: true,
                message: null
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
            if (qtrIndex !== -1) {
                const finalDownqtrData = quarterData.slice(qtrIndex + 1);
                if (!finalDownqtrData.length) return [];
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
            else {
                const finalData = [];
                return finalData;
            }
        },
        getNextMonday: function (date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 1 ? 7 : (8 - day) % 7;
            d.setDate(d.getDate() + diff);
            return d;
        },
        addDays: function (date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        },
        getNextSunday: function (date) {
            const day = date.getDay(); // 0 = Sunday, 6 = Saturday
            const daysToAdd = day === 0 ? 7 : 7 - day;
            date.setDate(date.getDate() + daysToAdd);
            return date;
        },
        compareArrays: function (arr1, arr2) {
            if (arr1.length !== arr2.length) return false;

            const getSortableDate = dateVal => new Date(dateVal).toISOString().split("T")[0];

            // Sort both arrays to ensure order doesn't affect comparison
            const sorted1 = [...arr1].sort((a, b) =>
                getSortableDate(a.PERIODSTART_UTC).localeCompare(getSortableDate(b.PERIODSTART_UTC))
            );
            const sorted2 = [...arr2].sort((a, b) =>
                getSortableDate(a.PERIODSTART_UTC).localeCompare(getSortableDate(b.PERIODSTART_UTC))
            );

            for (let i = 0; i < sorted1.length; i++) {
                const a = sorted1[i];
                const b = sorted2[i];

                if (
                    getSortableDate(a.PERIODSTART_UTC) !== getSortableDate(b.PERIODSTART_UTC) ||
                    getSortableDate(a.PERIODEND_UTC) !== getSortableDate(b.PERIODEND_UTC) ||
                    a.PERIODDESC !== b.PERIODDESC
                ) {
                    return false;
                }
            }
            return true;
        },
    };
});