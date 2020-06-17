# 每周总结可以写在这里
## js中特殊对象
Function Object

    call 视为函数Function
    Construct可以被new 操作符调用，根据new的规则返回对象。
Array Object

    DefineOwnProperty

    Property == length

    设置对象的length属性，根据length的变化对对象进行操作

    newLength > length 用空扩充数组

    newLength < length 截取数组

String Object

    string的length是不可写不可配的。

    Arguments Object

    callee 视为函数参数对对象，伪数组 caller

Object

    Get property被访问时调用 get

    Set property被赋值时调用 set

    GetPrototypeOf 对应getPrototypeOf方法 获取对象原型

    SetPrototypeOf对应setPrototypeOf方法 设置对象原型

    GetOwnProperty getOwnPropertyDescriptor 获取对象私有属性的描述列表

    HasProperty hasOwnProperty 私有属性判断

    IsExtensible isExtensible对象是否可扩展

    PreventExtensions preventExtension控制对象是否可以添加属性

    DefineOwnProperty defineProperty 定义对象属性

    Delete delete 操作符

    OwnPropertyKeys Object.keys() Object.entries() Object.values()

    Call 能够调用call

Module Namespece

    Module 视为一个引入的模块

    Exports 视为一个导出的模块
