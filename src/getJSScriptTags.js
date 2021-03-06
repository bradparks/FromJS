import getOpeningAndClosingTags from "./getOpeningAndClosingTags"
import useValue from "./tracing/stringTraceUseValue"
import cheerio from "./cheerio"


function processJSScriptTagsInHtml(html, replace){
    var scriptTags = [];

    html = useValue(html)

    var $ = cheerio.load(html)
    function getOuterHtml(el){
        return $('<div>').append(el.clone()).html()
    }

    $("script").each(function(i, scriptTag){
        scriptTag = $(scriptTag)
        var outerHtml = getOuterHtml(scriptTag);
        var isJS = !scriptTag.attr("type") || scriptTag.attr("type") === "text/javascript"
        var isInlineJS = isJS && !scriptTag.attr("src");
        var content = scriptTag.html()

        var parts = getOpeningAndClosingTags(outerHtml, content)

        if (isInlineJS && replace !== undefined) {
            content = replace(content)
        }

        var completeTag = parts.openingTag + content + parts.closingTag

        if (isJS) {
            scriptTags.push({
                openingTag: parts.openingTag,
                closingTag: parts.closingTag,
                content: content,
                completeTag: completeTag
            })
        }

        $(scriptTag[0]).replaceWith($(completeTag))
    })
    return {
        html: $.html(),
        scriptTags: scriptTags
    }
}

export function getJSScriptTags(html){
    return processJSScriptTagsInHtml(html).scriptTags
}

export function replaceJSScriptTags(html, replaceFunction){
    return processJSScriptTagsInHtml(html, replaceFunction).html
}

export function getScriptElements(html){
    return getJSScriptTags(html).map(function(tag){
        var wrapper = originalCreateElement.call(document, "div")
        nativeInnerHTMLDescriptor.set.call(wrapper, tag.completeTag) // we want to keep any script attributes
        wrapper.text = tag.content // re-assign so fromjs transforms it on assignment

        // I think the script doesn't get loaded / executed when the scriptEl
        // isn't created with createElement
        var scriptEl = originalCreateElement.call(document, "script");
        [].slice.apply(wrapper.children[0].attributes).forEach(function(attr){
            scriptEl.setAttribute(attr.name, attr.textContent)
        })
        if (tag.content !== "") {
            window.fromJSEnableTracing()
            scriptEl.text = tag.content // assignment will be processed by fromjs
            window.fromJSDisableTracing()
        }
        return scriptEl
    })
}
