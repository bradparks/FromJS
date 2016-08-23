import _ from "underscore"

var defaultConfig = {
    logUntrackedStrings: false,
    logUntrackedPropertyNames: false,
    validateHtmlMapping: false,
    logTracingSteps: false,
    // show value field below code, normally hidden for original page HTML
    alwaysShowValue: false,
    // Catch errors to avoid making app crash completely, but annoying for debugging
    catchUIErrors: true
}

var customConfig;
if (process.env.NODE_ENV === "production") {
    customConfig = {}
} else {
    customConfig = {
        alwaysShowValue: true,
        catchUIErrors: false
    }
}

var config = _.extend(defaultConfig, customConfig)

export default config
