const net = require('net');
const parser = require('./parser')
const images = require('images')
const render = require('./render')
class Request {
    // methods,url= host + port + path
    // body:{key:value}
    // headers
    constructor(options){
        this.method = options.method || 'GET'
        this.host = options.host
        this.port = options.port || 8080
        this.path = options.path || '/'
        this.body = options.body || {}
        this.headers = options.headers || {}
        if(!this.headers["Content-Type"]){
            this.headers["Content-Type"]="application/x-www-form-urlencoded"
        }
        if(this.headers["Content-Type"]==="application/json"){
            this.bodyText = JSON.stringify(this.body) 
        }else if(this.headers["Content-Type"]==="application/x-www-form-urlencoded"){
            this.bodyText = Object.keys(this.body).map(e=>{
                return `${e}=${encodeURIComponent(this.body[e])}`
            }).join('&')
            this.headers["Content-Length"]===this.bodyText.length
        }
    }
    open(method,url){}
    toString(){
        return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(e=>`${e}: ${this.headers[e]}`).join('\r\n')}\r\n
${this.bodyText}`
    }
    send(connection){
        return new Promise((res,rej)=>{
            const parser = new ResponseParser()
            if(connection){
                connection.write(this.toString());
            }else{
                connection = net.createConnection({
                    host:this.host,
                    port:this.port,
                },()=>{
                    connection.write(this.toString());
                })
            }
            connection.on('data', (data) => {
                parser.recive(data.toString())
                if(parser.isFinished){
                    res(parser.response)
                }
                console.log(parser.statusLine)
                console.log(parser.headers)
                // res(data.toString())
                connection.end()
            });
            connection.on('error', (err) => {
                rej(err)
                connection.end()
            })
        })
    }
}
class Response {

}
class ResponseParser { 
    constructor(){
        this.WAITING_STATUS_LINE = 0
        this.WAITING_STATUS_LINE_END = 1
        this.WAITING_HEADER_NAME = 2
        this.WAITING_HEADER_SPACE = 3
        this.WAITING_HEADER_VALUE = 4
        this.WAITING_HEADER_LINE_END = 5
        this.WAITING_HEADER_BLOCK_END = 6
        this.WAITING_BODY = 7
        this.current = this.WAITING_STATUS_LINE
        this.statusLine = ''
        this.headers = {}
        this.headerName = ''
        this.headerValue = ''
        this.bodyPaser = null
    }
    get isFinished(){
        return this.bodyPaser&&this.bodyPaser.isFinished
    }
    get response(){
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
        return {
            statusCode:RegExp.$1,
            statusText:RegExp.$2,
            headers:this.headers,
            body:this.bodyPaser.content.join('')
        }
    }
    recive(string){
        let len = string.length
        for(let i = 0; i < len; i++){
            this.reciveChar(string.charAt(i))
        }
    }
    reciveChar(char){
        if(this.current===this.WAITING_STATUS_LINE){
            // console.log(char.charCodeAt(0))
            if(char === '\r'){
                this.current=this.WAITING_STATUS_LINE_END
            }else if(char === '\n'){
                this.current=this.WAITING_HEADER_NAME
            }else{
                this.statusLine += char
            }
            // console.log(this.current)
        }else if(this.current===this.WAITING_STATUS_LINE_END){
            if(char === '\n'){
                this.current=this.WAITING_HEADER_NAME
            }
        } else if(this.current===this.WAITING_HEADER_NAME){
            // console.log(char)
            if(char === ':'){
                this.current=this.WAITING_HEADER_SPACE
                // console.log('------')
            }else if(char==='\r'){
                this.current=this.WAITING_HEADER_BLOCK_END
                if(this.headers['Transfer-Encoding']==='chunked'){
                    this.bodyPaser = new TrunkedBodyParser()
                }
            }else{
                this.headerName += char
            }
            // console.log(this.current)
        }else if(this.current===this.WAITING_HEADER_SPACE){
            if(char === ' '){
                this.current=this.WAITING_HEADER_VALUE
            }
        }else if(this.current===this.WAITING_HEADER_VALUE){
            if(char === '\r'){
                this.current=this.WAITING_HEADER_LINE_END
                this.headers[this.headerName] = this.headerValue
                this.headerName=''
                this.headerValue = ''
            }else{
                this.headerValue += char
            }
        }else if(this.current===this.WAITING_HEADER_LINE_END){
            if(char === '\n'){
                this.current=this.WAITING_HEADER_NAME
            }
        }else if(this.current===this.WAITING_HEADER_BLOCK_END){
            if(char === '\n'){
                this.current=this.WAITING_BODY
            }
        }else if(this.current===this.WAITING_BODY){
            // console.log('---',char)
            this.bodyPaser.reciveChar(char)
        }
       
    }
}
class TrunkedBodyParser { 
    constructor(){
        this.WAITING_LENGTH=0
        this.WAITING_LENGTH_LINE_END = 1
        this.READING_TRUNK = 2
        this.WAITING_NEW_LINE = 3
        this.WAITING_NEW_LINE_END = 4
        this.isFinished =false
        this.length = 0
        this.content = []
        this.current = this.WAITING_LENGTH
    }
    reciveChar(string){
        // console.log(JSON.stringify(string))
        if(this.current===this.WAITING_LENGTH){
            if(string==='\r'){
                if(this.length===0){
                    this.isFinished =true
                    // console.log(this.content)
                }
                this.current = this.WAITING_LENGTH_LINE_END
            }else{
                this.length *= 16
                this.length+=parseInt(string,16)
                // this.length+=string.charCodeAt(0) - '0'.charCodeAt(0)
                // console.log('====',this.length)
            }
        }else if (this.current===this.WAITING_LENGTH_LINE_END){
            if(string==='\n'){
                this.current = this.READING_TRUNK
            }
        }else if (this.current===this.READING_TRUNK){
            // console.log('---',JSON.stringify(string))
            if(string==='\r'){
                this.current=this.WAITING_LENGTH
            }else{
                this.content.push(string)
                this.length --
                if(this.length === 0){
                    this.current = this.WAITING_NEW_LINE
                }
            }
        }else if (this.current===this.WAITING_NEW_LINE){
            if(string==='\r'){
                this.current = this.WAITING_NEW_LINE_END
            }
        }else if (this.current===this.WAITING_NEW_LINE_END){
            if(string==='\n'){
                this.current = this.WAITING_LENGTH
            }
        }
    }
}
void async function(){
    let request = new Request({
        method:'POST',
        host:'127.0.0.1',
        port:'8080',
        path:'/',
        headers:{
            ['X-Foo2']:'customed'
        },
        body:{
            name:'yangbo'
        }
    })
    let res = await request.send()
    var result = parser.parseHTML(res.body)
    console.log('----',JSON.stringify(result,null,"      ") )
    let viewport = images(800,600)
    render(viewport,dom.children[0].children[3].children[1].children[1])
    viewport.save('viewport.jpg')
    // console.log(res)
}()

// 官方测试demo
/*const client = net.createConnection(
    { 
        host:'127.0.0.1',
        port: 8080 
    }, () => {
    console.log('已连接到服务器');
    let request = new Request({
        method:'POST',
        host:'127.0.0.1',
        port:'8080',
        path:'/',
        headers:{
            ['X-Foo2']:'customed'
        },
        body:{
            name:'yangbo'
        }
    })
    console.log(request.toString()+'\r\n')
    client.write(request.toString());
    // client.write('POST / HTTP/1.1\r\n');
    // client.write('Host: 127.0.0.1\r\n');
    // client.write('Content-Length: 20\r\n');
    // client.write('Content-Type: application/x-www-form-urlencoded\r\n');
    // client.write('\r\n');
    // client.write('field1=aaa&code=x%3D1');
  });
  client.on('data', (data) => {
    console.log(data.toString());
    client.end();
  });
  client.on('end', () => {
    console.log('已从服务器断开');
  });
  client.on('error', (err) => {
    console.log(err);
    client.end();
  });*/