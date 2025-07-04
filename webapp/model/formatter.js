sap.ui.define([], function () {
    "use strict";

    return {  
        formatErrorStyle: function (iValue) {
        if(iValue === true){
            return "Error";
        }
        else {
            return "None";
        }            
    },
    formatLevel:function(value){
        if(value === 'W'){
            return "Week";
        }
        else if(value === 'M'){
            return "Month";
        }
        else if(value === 'Q'){
            return "Quarter";
        }
    }
}  
});