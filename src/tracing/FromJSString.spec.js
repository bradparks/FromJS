import {makeTraceObject} from "./FromJSString"

function makeString(str){
    return makeTraceObject({
        value: str,
        origin: {
            isFromJSOriginObject: true,
            value: str
        }
    })
}

describe("FromJSString", function(){
    it("Accepts undefined parameters", function(){
        var str = makeTraceObject({
            value: "Hi",
            origin: {}
        })
        var index = str.indexOf(undefined)
        expect(index).toBe(-1)
    })
    it("Should not have any enumerable properties that could leak in a for...in loop", function(){
        var str = makeTraceObject({
            value: "Hi",
            origin: {}
        })

        var keys = []
        for (var key in str){
            keys.push(key);
        }
        expect(keys).toEqual([])
    })
    it("Lets you access character at a specific index", function(){
        var str = makeTraceObject({
            value: "Hello",
            origin: {}
        })

        var char = str[0]
        expect(char).toBe("H")
    })

    it("Supports charCodeAt", function(){
        var str = makeString("ABC")
        expect(str.charCodeAt(0)).toBe(65)
    })

    it("indexOf supports a fromIndex", function(){
        var str = makeString("123123")
        expect(str.indexOf("1", 2)).toBe(3)
    })

    it("lastIndexOf supports a fromIndex", function(){
        var str = makeString("abc")
        expect(str.indexOf("a", 1)).toBe(-1)
    })

    describe("substr", function(){
        it("Supports calls with one parameter", function(){
            var str = makeString("Hello")

            str = str.substr(1)
            expect(str.value).toBe("ello")
            expect(str.origin.action).toBe("Substr Call")
        })
        it("Supports calls with one parameter", function(){
            var str = makeString("Hello")

            str = str.substr(1, 2)
            expect(str.value).toBe("el")
            expect(str.origin.action).toBe("Substr Call")
        })
    })

    describe("Search", function(){
        it("Works for regular expressions", function(){
            var res = makeString("Hello").search(/l/)
            expect(res).toBe(2)
        })
        it("Works for strings", function(){
            var res = makeString("Hello").search("l")
            expect(res).toBe(2)
        })
        it("Works when there's no match", function(){
            var res = makeString("Hello").search("k")
            expect(res).toBe(-1)
        })
    })

    describe("substring", function(){
        it("Supports calls with two parameters", function(){
            var str = makeTraceObject({
                value: "01234",
                origin: {}
            })

            str = str.substring(1,4)
            expect(str.value).toBe("123")
            expect(str.origin.action).toBe("Substring Call")
        })
        it("Supports susbtring calls without a second parameter", function(){
            var str = makeTraceObject({
                value: "01234",
                origin: {}
            })

            str = str.substring(1)
            expect(str.value).toBe("1234")
            expect(str.origin.action).toBe("Substring Call")
        })
    })

    it("Shows the native string object as the traced string constructor", function(){
        var str = makeTraceObject({
            value: "Hello",
            origin: {}
        })

        expect(str.constructor).toBe(window.String)
    })

    it("Throws an error when trying to use in operator on string", function(){
        var str = makeTraceObject({
            value: "Hello",
            origin: {}
        })

        expect(function(){
            "sth" in str
        }).toThrow()
    })

    describe("split", function(){
        it("Falls back to native split if a limit is passed in", function(){
            var str = makeString("a-b-c")
            expect(str.split("-", 2).map(s => s.value)).toEqual(["a", "b"])
        })
        it("Works with a string literal", function(){
            var str = makeString("a-b-c")
            var res = str.split("-")
            expect(res.map(s => s.value)).toEqual(["a", "b", "c"])
            expect(res[0].origin.action).toBe("Split Call")
            expect(res[0].origin.inputValues[0]).toBe(str.origin)
            expect(res[0].origin.inputValuesCharacterIndex[0]).toBe(0)
            expect(res[0].origin.inputValues[1].value).toBe("-")
            expect(res[1].origin.inputValuesCharacterIndex[0]).toBe(2)
        })
        it("Works with a regular expression", function(){
            var str = makeString("a--b-c")
            var res = str.split(/[-]+/)
            expect(res.map(s => s.value)).toEqual(["a", "b", "c"])
            expect(res[0].origin.action).toBe("Split Call")
            expect(res[0].origin.inputValues[0]).toBe(str.origin)
            expect(res[0].origin.inputValues[1].value).toBe("/[-]+/")
            expect(res[1].origin.inputValuesCharacterIndex[0]).toBe(3)
        })
        it("Works with a regular expression and an empty string", function(){
            var str = makeString("")
            var res = str.split(/[-]+/)
            expect(res.length).toEqual(1)
        })
    })

    describe("match", function(){
        it("Works with a regex", function(){
            var str = makeString("Hello")
            expect(str.match(/l+/)[0]).toBe("ll")
        })
        it("Works with a string", function(){
            var str = makeString("Hello")
            expect(str.match("ll")[0]).toBe("ll")
        })
    })

    describe("replace", function(){
        it("Supports basic replace calls", function(){
            var str = makeTraceObject({
                value: "Hello World!",
                origin: {}
            })

            str = str.replace("Hello", "Hi");
            expect(str.value).toBe("Hi World!");
        })

        it("Supports using a number as a replacement", function(){
            var str = makeTraceObject({
                value: "Hi!",
                origin: {}
            })

            str = str.replace("!", 10)
            expect(str.value).toBe("Hi10")
        })

        it("Supports submatch replacements with $n", function(){
            var str = makeTraceObject({
                value: "Hello!",
                origin: {}
            })

            str = str.replace(/(!)/, "$1$1");
            expect(str.value).toBe("Hello!!")
        })

        it("Supports submatch replacements with $&", function(){
            var str = makeTraceObject({
                value: "Hi",
                origin: {}
            })

            str = str.replace(/(i)/, "$&!")
            expect(str.value).toBe("Hi!")
        });

        it("Keeps the $n string if the submatch doesn't exist in the regex", function(){
            var str = makeTraceObject({
                value: "Hello",
                origin: {}
            })

            str = str.replace(/H/, "$1")
            expect(str.value).toBe("$1ello")
        })

        it("Replaces an unmatched submatch with an empty string", function(){
            var str = makeTraceObject({
                value: "Hello",
                origin: {}
            })

            str = str.replace(/(X)?/, "$1")
            expect(str.value).toBe("Hello")
        })

        it("Supports a replacement function that returns a string", function(){
            var str = makeTraceObject({
                value: "123",
                origin: {}
            })

            str = str.replace(/(\d)/g, function(val){
                return parseFloat(val) + 1;
            })
            expect(str.value).toBe("234")
        })

        it("Supports a replacement function that returns undefined", function(){
            var str = makeTraceObject({
                value: "sth",
                origin: {}
            })

            str = str.replace(/s/, function(val){
                return undefined
            })
            expect(str.value).toBe("undefinedth")
        })
    })
})
