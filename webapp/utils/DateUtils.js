// File: utils/DateUtils.js
sap.ui.define([], () => {
    "use strict";

    return {
        formattedDate(date1) {
            const date = new Date(date1);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        formattedDateStart(date1, flag) {
            const date = new Date(date1);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day} ${flag === '' ? '00:00:00.000000000' : '23:59:00.000000000'}`;
        },

        formattedNewDate(date) {
            const [month, day, year] = date.split(" ")[0].split("/");
            const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
            const utcDate = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)));
            const formattedDate = `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
            return formattedDate;
        },

        getISODate(dateVal) {
            return new Date(dateVal).toISOString().split("T")[0];
        },
        getExcelDate(dateValue) {
            const [month, day, year] = dateValue.split('/');
            const formatted = `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            return formatted;
        }
    };
});
