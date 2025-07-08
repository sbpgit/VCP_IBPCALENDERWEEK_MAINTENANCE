// File: utils/DataValidator.js
sap.ui.define([], function () {
    "use strict";

    const getISO = date => new Date(date).toISOString().split("T")[0];

    return {
        checkContinuousFlow(periods) {
            for (let i = 1; i < periods.length; i++) {
                const prevEnd = new Date(periods[i - 1].PERIODEND);
                const currStart = new Date(periods[i].PERIODSTART);
                prevEnd.setDate(prevEnd.getDate() + 1);
                prevEnd.setHours(0, 0, 0, 0);
                if (currStart.getTime() !== prevEnd.getTime()) {
                    return false;
                }
            }
            return true;
        },

        compareArrays(arr1, arr2) {
            if (arr1.length !== arr2.length) return false;
            const sorted1 = [...arr1].sort((a, b) => getISO(a.PERIODSTART_UTC).localeCompare(getISO(b.PERIODSTART_UTC)));
            const sorted2 = [...arr2].sort((a, b) => getISO(a.PERIODSTART_UTC).localeCompare(getISO(b.PERIODSTART_UTC)));

            for (let i = 0; i < sorted1.length; i++) {
                const a = sorted1[i];
                const b = sorted2[i];
                if (
                    getISO(a.PERIODSTART_UTC) !== getISO(b.PERIODSTART_UTC) ||
                    getISO(a.PERIODEND_UTC) !== getISO(b.PERIODEND_UTC) ||
                    a.PERIODDESC !== b.PERIODDESC
                ) {
                    return false;
                }
            }
            return true;
        },

        mergeWithoutConflicts(array1, array2) {
            const startSet = new Set(array1.map(obj => `${obj.TPLEVEL}-${new Date(obj.PERIODSTART_UTC)}`));
            const endSet = new Set(array1.map(obj => `${obj.TPLEVEL}-${new Date(obj.PERIODEND_UTC)}`));

            const nonConflictingArray2 = array2.filter(obj => {
                const startKey = `${obj.TPLEVEL}-${new Date(obj.PERIODSTART_UTC)}`;
                const endKey = `${obj.TPLEVEL}-${new Date(obj.PERIODEND_UTC)}`;
                return !startSet.has(startKey) && !endSet.has(endKey);
            });

            const merged = [...array1, ...nonConflictingArray2];
            const periodDescMap = new Map();

            merged.forEach(obj => {
                const desc = obj.PERIODDESC;
                periodDescMap.set(desc, (periodDescMap.get(desc) || 0) + 1);
            });

            return merged.map(obj => {
                return {
                    ...obj,
                    ISDUPLICATEDESC: periodDescMap.get(obj.PERIODDESC) > 1
                };
            });
        }
    };
});
