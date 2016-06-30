import React from "react"
import _ from "underscore"
import resolveFrame from "../resolve-frame"
import getRootOriginAtChar from "../getRootOriginAtChar"
import whereDoesCharComeFrom from "../whereDoesCharComeFrom"

export class OriginPath extends React.Component {
    render(){
        var lastOrigin = this.props.originPath[this.props.originPath.length - 1]

        var fullPath = [];
        for (var originPathItem of this.props.originPath) {
            fullPath.push(<OriginPathItem
                originPathItem={originPathItem}
                handleValueSpanClick={this.props.handleValueSpanClick}
            />)
        }
        return <div>
            <OriginPathItem
                key={JSON.stringify(lastOrigin)}
                originPathItem={lastOrigin}
                handleValueSpanClick={this.props.handleValueSpanClick}
            />
            <hr/>
            {fullPath}
        </div>
    }
}

class OriginPathItem extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            resolvedFrame: null
        }
    }
    componentDidMount(){
        var frame = _.first(this.props.originPathItem.originObject.stack)
        if (frame){
            resolveFrame(frame, (err, resolvedFrame) => {
                this.setState({resolvedFrame})
            })
        }
    }
    render(){
        var originObject = this.props.originPathItem.originObject


        var filename = "";
        if (this.state.resolvedFrame) {
            filename = this.state.resolvedFrame.fileName.replace("?dontprocess=yes", "");
            var filenameParts = filename.split("/")
            filename = _.last(filenameParts)
        }

        return <div style={{border: "1px solid #ddd", marginBottom: 20}}>
            <div >
                <div style={{background: "aliceblue"}}>
                    <span style={{
                        display: "inline-block",
                        padding: 5
                     }}>
                        <span style={{fontWeight: "bold", marginRight: 5}}>
                            {originObject.action}
                        </span>
                        &nbsp;
                        <span>
                            {filename}
                        </span>
                    </span>
                </div>

                <Stack originPathItem={this.props.originPathItem} />
            </div>
            <div style={{borderTop: "1px dotted #ddd"}}>
                <ValueEl
                    originPathItem={this.props.originPathItem}
                    handleValueSpanClick={this.props.handleValueSpanClick} />
            </div>
        </div>
    }
}

class ValueEl extends React.Component {
    render(){
        var origin = this.props.originPathItem;
        var val = origin.originObject.value

        return <TextEl
            text={val}
            highlightedCharacterIndex={origin.characterIndex}
            onCharacterClick={(charIndex) => this.props.handleValueSpanClick(origin.originObject,  charIndex)}
        />
    }
}



class TextEl extends React.Component {
    render(){
        var self = this;
        function processChar(char){
            if (char==="\n"){
                char = "\\n"
            }
            if (char===" ") {
                char = '\xa0'
            }
            if (char==="\t"){
                char = "\\t"
            }
            return char
        }
        function getValueSpans(val, indexOffset){

            var els = [];
            for (let index in val){
                index = parseFloat(index)
                var char = val[index]
                char = processChar(char)
                var span = <span
                    onClick={() => {
                        self.props.onCharacterClick(index + indexOffset)
                    }}
                >
                    {char}
                </span>
                els.push(span)
            }
            return els
        }

        var val = this.props.text
        var highlightedCharIndex = this.props.highlightedCharacterIndex

        if (highlightedCharIndex === undefined || highlightedCharIndex === null) {
            return <div className="fromjs-value">
                {getValueSpans(val, 0)}
            </div>
        } else {
            var valBeforeColumn = val.substr(0, highlightedCharIndex);
            var valAtColumn = val.substr(highlightedCharIndex, 1);
            var valAfterColumn = val.substr(highlightedCharIndex+ 1)

            var beforeColumnValueSpans = getValueSpans(valBeforeColumn, 0)
            // if content is too long to hide the highlight truncate text
            // cut the list of spans rather than the valBeforeColumn string
            // to maintain the correct character index on click on a char
            if (beforeColumnValueSpans.length > 50) {
                var beforeEllipsis = beforeColumnValueSpans.slice(0, 10)
                var afterEllipsis = beforeColumnValueSpans.slice(beforeColumnValueSpans.length - 20)
                beforeColumnValueSpans = [
                    ...beforeEllipsis,
                    <span>...</span>,
                    ...afterEllipsis
                ]
            }

            return <HorizontalScrollContainer>
                <div className="fromjs-value">
                    {beforeColumnValueSpans}
                    <span style={{color: "red", fontWeight: "bold"}}>
                        <pre style={{display: "inline"}}>{processChar(valAtColumn)}</pre>
                    </span>
                    {getValueSpans(valAfterColumn, valBeforeColumn.length + valAtColumn.length)}
                </div>
            </HorizontalScrollContainer>
        }


    }
}

class Stack extends React.Component {
    render(){
        var originPathItem = this.props.originPathItem;
        if (!originPathItem.originObject.stack) {
            return <div style={{padding:5}}>(No stack)</div>
        }

        if (originPathItem.originObject.stack.length === 0) {
            return <div style={{padding: 5}}>(Empty stack)</div>
        }

        var frame = _.first(originPathItem.originObject.stack)

        var nthChar = null;
        if (originPathItem.originObject.action === "string literal"){
            nthChar = "'".length + originPathItem.characterIndex
        }

        return <div>
            <StackFrame
                frame={frame}
                key={frame}
                highlightStringIndex={nthChar} />
        </div>
    }
}

class StackFrame extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            resolvedFrame: null
        }
    }
    componentDidMount(){
        resolveFrame(this.props.frame, (err, resolvedFrame) => {
            this.setState({resolvedFrame})
        })
    }
    render(){
        function processFrameString(str){
            return str
                .replace(/ /g, '\xa0') //nbsp
                .replace(/\t/g, "\\t")
        }

        if (this.state.resolvedFrame === null) {
            return <div>Loading...</div>
        }

        var frame = this.state.resolvedFrame;


        var highlighNthCharAfterColumn = this.props.highlightStringIndex;
        var highlightStyle = {color: "red"}
        var hasHighlight = highlighNthCharAfterColumn !== undefined && highlighNthCharAfterColumn !== null
        if (!hasHighlight) {
            highlighNthCharAfterColumn = 0
            highlightStyle = {}
        }

        // OMG this is so fragile and edge case buggy!
        // two chars in a string literal can map to one char in the actual string value (i.e. if there's an escape sequence like
        // "\n" that becomes one new line character)
        var strBetweenBarAndHighlight = frame.line.substring(frame.columnNumber, frame.columnNumber + highlighNthCharAfterColumn)
        highlighNthCharAfterColumn += strBetweenBarAndHighlight.split("\\").length -1
        strBetweenBarAndHighlight = frame.line.substring(frame.columnNumber, frame.columnNumber + highlighNthCharAfterColumn)

        // If strings are too long and would hide highlighted content truncate them
        var strBeforeBar = frame.line.substr(0, frame.columnNumber)
        console.log(strBeforeBar, strBeforeBar.length)
        if (strBeforeBar.length > 50) {
            strBeforeBar = strBeforeBar.substr(0, 10) + "..." + strBeforeBar.substr(strBeforeBar.length - 10)
        }
        if (strBetweenBarAndHighlight.length > 50) {
            strBetweenBarAndHighlight = strBetweenBarAndHighlight.substr(0, 10) + "..." + strBetweenBarAndHighlight.substr(strBetweenBarAndHighlight.length - 20)
        }




        return <HorizontalScrollContainer>
            <code className="fromjs-stack__code" style={{
                paddingTop: 5,
                display: "block",
                paddingBottom: 5
            }}>
                <span className="fromjs-stack__line-number">{frame.lineNumber - 1}</span>
                <span style={{opacity: .6}}>{processFrameString(frame.prevLine)}</span>
                <br/>
                <span className="fromjs-stack__line-number">{frame.lineNumber}</span>
                <span>
                    {processFrameString(strBeforeBar)}
                </span>
                <span style={{color: "red"}}>|</span>
                <span>
                    {processFrameString(strBetweenBarAndHighlight)}
                </span>
                <span style={highlightStyle}>
                    {processFrameString(frame.line.substr(frame.columnNumber + highlighNthCharAfterColumn, 1))}
                </span>
                <span>
                    {processFrameString(frame.line.substr(frame.columnNumber + highlighNthCharAfterColumn + 1))}
                </span>
                <br/>
                <span className="fromjs-stack__line-number">{frame.lineNumber + 1}</span>
                <span style={{opacity: .6}}>{processFrameString(frame.nextLine)}</span>
            </code>
        </HorizontalScrollContainer>
    }
}

class HorizontalScrollContainer extends React.Component {
    render(){
        return <div className="fromjs-horizontal-scroll-container">
            <div>
                {this.props.children}
            </div>
        </div>
    }
}

export class FromJSView extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            el: null,
            characterIndex: null,
            previewEl: null,
            rootOrigin: null
        }
    }
    render(){
        var preview = null;
        var info = null;
        if (this.state.previewEl !== null && this.state.previewEl !== this.state.el){
            var characterIndex = this.getDefaultCharacterIndex(this.state.previewEl);
            var useful = getRootOriginAtChar(this.state.previewEl, characterIndex);
            console.log("used origin", useful)
            console.log("has char", useful.origin.value[useful.characterIndex])

            var originPath = whereDoesCharComeFrom(useful.origin, useful.characterIndex)
            preview = <div >
                <div style={{padding: 10}}>
                    <div style={{border: "1px solid #ddd"}}>
                        <TextEl
                            highlightedCharacterIndex={characterIndex}
                            text={this.state.previewEl.outerHTML} />
                    </div>
                </div>
                <hr/>
                <div style={{padding: 10}}>
                    <OriginPathItem
                        originPathItem={_.last(originPath)} />
                </div>
            </div>
        }
        else if(this.state.el){
            var origin = null;
            if (this.state.characterIndex !== null) {
                var useful = this.getOriginAndCharacterIndex()
                console.log("used origin", useful)
                console.log("has char", useful.origin.value[useful.characterIndex])

                var originPath = whereDoesCharComeFrom(useful.origin, useful.characterIndex)
                origin = <div style={{padding: 10}}>
                    <OriginPath
                        originPath={originPath}
                        handleValueSpanClick={(origin, characterIndex) => {
                            console.log("clicked on", characterIndex, origin)
                            this.setState({
                                rootOrigin: origin,
                                characterIndex
                            })
                        }} />
                </div>
            }

            info = <div>
                <div style={{padding: 10}}>
                    <div style={{border: "1px solid #ddd"}}>
                        {this.state.el ? <TextEl
                            text={this.state.el.outerHTML}
                            highlightedCharacterIndex={this.originComesFromElement() ? this.state.characterIndex : null}
                            onCharacterClick={(characterIndex) => this.setState({characterIndex})}
                            /> : "no el"}
                    </div>
                </div>
                <hr/>
                {origin}
            </div>
        }



        return <div id="fromjs" className="fromjs">
            {preview}

            {info}
        </div>
    }
    originComesFromElement(){
        return this.state.rootOrigin === null
    }
    getOriginAndCharacterIndex(){
        if (this.originComesFromElement()) {
            var characterIndex = parseFloat(this.state.characterIndex);
            var useful = getRootOriginAtChar(this.state.el, characterIndex);
            return useful
        } else {
            return {
                characterIndex: this.state.characterIndex,
                origin: this.state.rootOrigin
            }
        }
    }
    getDefaultCharacterIndex(el){
        var defaultCharacterIndex = el.outerHTML.indexOf(">") + 1;
        if (defaultCharacterIndex >= el.outerHTML.length) {
            defaultCharacterIndex = 1;
        }
        return defaultCharacterIndex
    }
    display(el){
        this.setState({
            el: el,
            characterIndex: this.getDefaultCharacterIndex(el),
            rootOrigin: null
        })
    }
    setPreviewEl(el){
        this.setState({previewEl: el})
    }
}