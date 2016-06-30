var endsWith = require("ends-with")
var StackTraceGPS = require("./stacktrace-gps")
var ErrorStackParser = require("./error-stack-parser")

var gps = null;

function resFrame(frame, callback){
    gps._get(frame.fileName).then(function(src){
        var lines = src.split("\n")
        frame.prevLine = lines[frame.lineNumber - 1 - 1]// adjust for lines being one-indexed
        frame.nextLine = lines[frame.lineNumber + 1 - 1]
        frame.line = lines[frame.lineNumber - 1];

        callback(null, JSON.parse(JSON.stringify(frame)))
    })

}

function initGPSIfNecessary(){
    if (gps !== null) return;

    var sourceCache = {};
    var fnEls = document.getElementsByClassName("string-trace-fn")
    fnEls = Array.prototype.slice.call(fnEls)
    fnEls.forEach(function(el){
        var key = el.getAttribute("fn") + ".js"
        sourceCache[key] = el.innerHTML
        sourceCache[key + "?dontprocess=yes"] = decodeURIComponent(el.getAttribute("original-source"))
        sourceCache[el.getAttribute("sm-filename")] = decodeURIComponent(el.getAttribute("sm"))
    })

    gps = new StackTraceGPS({sourceCache: sourceCache});
}

export default function(frame, callback){
    initGPSIfNecessary()

    var frameObject = ErrorStackParser.parse({stack: frame})[0];

    // Force asynchronous callback call, to avoid calling setState on
    // uninitialized compnent in React when using resolveFrame in constructor
    setTimeout(function(){
        if (endsWith(frameObject.fileName, ".html")){
            // don't bother looking for source map file
            callback(null, frame)
        } else {
            gps.pinpoint(frameObject).then(function(newFrame){
                resFrame(newFrame, callback)
            }, function(){
                resFrame(frameObject, callback)
                console.log("error", arguments)
            });
        }
    })
}
