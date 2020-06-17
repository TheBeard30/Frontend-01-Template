const EOF = Symbol('EOF') //EOF:end of file
const css = require('css')
const layout = require('./layout')
let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;
let stack =[{type:"document",children:[]}]
let rules = []

function addCSSRules(text){
    var ast = css.parse(text)
    // console.log('----',JSON.stringify(ast,null,"         "))
    rules.push(...ast.stylesheet.rules)
}
function computeCSS(ele){
    // console.log('rules:',rules)
    // console.log('ele:',ele)
    var eles = stack.slice().reverse() 
    if(!ele.computedStyle){
        ele.computedStyle={}
    }
    let matched = false
    for(let rule of rules){
        var selectorParts = rule.selectors[0].split(" ").reverse()
        if(!match(ele,selectorParts[0])){
            continue
        }
        var j =  1;
        for(var i=0;i<eles.length;i++){
            if(match(eles[i],selectorParts[j])){
                j++
            }
        }
        if(j>=selectorParts.length){
            matched=true
        }
        if(matched){
            var sp = specificity(rule.selectors[0])
            console.log('rule:',ele.computedStyle,'===',sp)
            var computedStyle = ele.computedStyle
            for(var declaration of rule.declarations){
                if(!computedStyle[declaration.property]){
                    computedStyle[declaration.property]={}
                }
                if(!computedStyle[declaration.property].specificity){
                    computedStyle[declaration.property].value=declaration.value
                    computedStyle[declaration.property].specificity = sp
                }else if(compare(computedStyle[declaration.property].specificity,sp)<0){
                    computedStyle[declaration.property].value=declaration.value
                    computedStyle[declaration.property].specificity = sp
                }
            }
            // console.log(111111)
            // console.log('rule:',ele.computedStyle,'===',sp)
        }
    }
}

function compare(s1,s2){
    if(s1[0] - s2[1]){
        return s1[0]-s2[0]
    }
    if(s1[1]-s2[1]){
        return s1[1]-s2[1]
    }
    if(s1[2]-s2[2]){
        return s1[2]-s2[2]
    }
    return s1[3]-s2[3]
}

function specificity(selector){
    var p =[0,0,0,0]
    var selectorParts = selector.split(" ")
    for(var part of selectorParts){
        if(part.charAt(0)=="#"){
            p[1]+=1
        }else if(part.charAt(0)=="."){
            p[2]+=1
        }else{
            p[3]+=1
        }
    }
    return p
}

function match(ele,selector){
    if(!selector||!ele.attributes){
        return false
    }
    if(selector.charAt(0) == "#"){
        var attr = ele.attributes.filter(attr=>attr.name==="id")
        if(attr && attr.value===selector.replace("#","")){
            return true
        }
    }else if(selector.charAt(0)=="."){
        var attr = ele.attributes.filter(attr=>attr.name==="class")
        // 多个类名
        // var attrArr = attr.value && attr.value.split(" ")
        // if(attr && attrArr.includes(selector.replace(".",""))){
        if(attr && attr.value===selector.replace(".","")){
            return true
        }   
    }else {
        if(ele.tagName===selector){
            return true
        }
    }
    return false
}


function emit(token){
    let top = stack[stack.length-1]
    if(token.type=="startTag"){
        let ele = {
            type:"element",
            children:[],
            attributes:[]
        }
        ele.tagName=token.tagName
        for(let t in token){
            if(t!="type"||t!="tagName"){
                ele.attributes.push({
                    name:t,
                    value:token[t]
                })
            }
        }
        computeCSS(ele);
        top.children.push(ele)
        // console.log(top)
        ele.parent=top
        if(!token.isSelfClosing){
            stack.push(ele)
        }
        currentTextNode = null
    }else if(token.type==="endTag"){
        if(top.tagName!=token.tagName){
            throw new Error("tag start end doesn't match")
        }else {
            if(top.tagName == "style"){
                addCSSRules(top.children[0].content)
            }
            layout(top);
            stack.pop()
        }
        currentTextNode = null
    }else if(token.type == "text"){
        if(currentTextNode == null){
            currentTextNode={
                type:"text",
                content:""
            }
        }
        top.children.push(currentTextNode)
        currentTextNode.content+=token.content
    }
    
}
// 解析标签
function data(c){
    if(c == "<"){
        return tagOpen;
    }else if(c == EOF){
        emit({
            type:"EOF"
        })
        return ;
    }else {
        emit({
            type:"text",
            content:c
        })
        return data;
    }
}
// </ =>endTagOpen   <sss =>tagName
function tagOpen(c){
    if(c == "/"){
        return endTagOpen
    }else if(c.match(/[a-zA-Z]$/)){
        currentToken = {
            type:"startTag",
            tagName:""
        }
        return tagName(c)
    }else{
        emit({
            type:'text',
            content:c
        })
        return ;
    }
}

function tagName(c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAtrributeName
    }else if (c == "/"){
        return selfClosingStartTag
    }else if(c.match(/^[a-zA-Z]$/)){
        currentToken.tagName+=c
        return tagName
    }else if(c == ">"){
        emit(currentToken)
        return data
    }else {
        currentToken.tagName+=c
        return tagName
    }
}

function beforeAtrributeName (c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAtrributeName
    }else if(c == ">" || c == "/" || c == EOF){
        return afterAttributeName(c)
    }else if(c == "="){
        
    }else {
        currentAttribute = {
            name:"",
            value:""
        }
        return attributeName(c)
    }
}

function attributeName(c){
    if(c.match(/^[\t\n\f ]$/)||c == "/"||c == ">"||c == EOF){
        return afterAttributeName(c)
    }else if(c == "="){
        return beforeAtrributeValue
    }else if(c == "\u0000"){

    }else if(c == "\"" || c == "'"|| c == "<"){

    }else{
        currentAttribute.name+=c
        return attributeName
    }
}

function beforeAtrributeValue(c){
    if(c.match(/^[\t\n\f ]$/)||c == "/"||c == ">"||c == EOF){
        return beforeAtrributeValue
    }else if(c == "\""){
        return doubleQuotedAttributeValue
    }else if(c == "\'"){
        return singleQuotedAttributeValue
    }else if(c == ">"){

    }else{
        return UnquotedAttributeValue(c)
    }
}

function doubleQuotedAttributeValue(c){
    if(c == "\""){
        currentToken[currentAttribute.name]=currentAttribute.value
        return afterQuotedAttributeValue
    }else if(c == "\u0000"){
        
    }else if(c == EOF){

    }else{
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function singleQuotedAttributeValue(c){
    if(c == "\'"){
        currentToken[currentAttribute.name]=currentAttribute.value
        return afterQuotedAttributeValue
    }else if(c == "\u0000"){
        
    }else if(c == EOF){

    }else{
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function afterQuotedAttributeValue (c){
    if(c.match(/^[\t\n\f ]$/)){
        return beforeAtrributeName
    }else if(c == "/"){
        return selfClosingStartTag
    }else if(c == ">"){
        currentToken[currentAttribute.name]=currentAttribute.value
        emit(currentToken)
        return data
    }else if(c == EOF){

    }else{
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function UnquotedAttributeValue(c){
    if(c.match(/^[\t\n\f ]$/)){
        currentToken[currentAttribute.name]=currentAttribute.value
        return beforeAtrributeName
    }else if(c == "/"){
        currentToken[currentAttribute.name]=currentAttribute.value
        return selfClosingStartTag
    }else if(c == ">"){
        currentToken[currentAttribute.name]=currentAttribute.value
        emit(currentToken)
        return data
    }else if(c == "\u0000"){

    }else if(c == "\"" || c == "\'" || c == "<" || c == "=" || c == "`"){

    }else if (c==EOF){

    }else {
        currentAttribute.value += c
        return UnquotedAttributeValue
    }
}

function selfClosingStartTag (c){
    if(c == ">"){
        currentToken.isSelfClosing = true
        emit(currentToken)
        return data
    }else if(c===EOF){
        
    }else {
        
    }
}


function endTagOpen(c){
    if(c.match(/^[a-zA-Z]$/)){
        currentToken = {
            type:'endTag',
            tagName:''
        }
        return tagName(c)
    }else if(c== ">"){
        
    }else if(c===EOF){
        
    }else {

    }
}


function afterAttributeName (c){
    if(c.match(/^[\t\n\f ]$/)){
        return afterAttributeName
    }else if(c == "/") {
        return selfClosingStartTag
    }else if(c == "=") {
        return beforeAtrributeValue
    }else if(c == ">") {
        currentToken[currentAttribute.name]= currentAttribute.value
        emit(currentToken)
        return data
    }else if(c == EOF) {
        
    }else {
        currentToken[currentAttribute.name] = currentAttribute.value
        currentAttribute={
            name:"",
            value:""
        }
        return attributeName(c)
    }
}


module.exports.parseHTML = function parseHTML(html){
    // 使用有限状态机来实现html部分解析
    let state = data
    for(let c of html){
        state=state(c)
    }
    state = state(EOF)
    console.log(stack[0])
    return stack[0]
    // console.log(JSON.stringify(stack[0],'     ',null) )
    // console.log('::::---',html)
}