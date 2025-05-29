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
    }
}  
});