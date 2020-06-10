```javascript
function matchChild(selector, element) {
    if (!selector || !element) return false
    const regPattern = /(#[a-zA-Z]+[_a-zA-Z0-9-]*?)|(\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*)|([a-z]+)/g
    const matched = selector.match(regPattern)
    let matchTime = 0

    for (const p of matched) {
        if (p.charAt(0) === '#') {
            const attr = Array.from(element.attributes).filter(attr => (attr as any).name === 'id')[0]
            if (attr && (attr as any).value === p.replace('#', '')) {
                matchTime++
            }
        } else if (p.charAt(0) === '.') {
            const attr = Array.from(element.attributes).filter(attr => (attr as any).name === 'class')[0]

            if (attr) {
                const classes = (attr as any).value.split(' ')

                for (let className of classes) {
                    if (className === p.replace(".", '')) {
                        matchTime++
                    }
                }
            }
        } else {
            console.dir(element)
            if (element.tagName.toLowerCase() === p) {
                matchTime++
            }
        }
    }

    return matchTime === matched.length
}
function match(selector, element) {
    if (!element || !selector) {
        return false
    }
    let elements = [element]
    let curNode = element
    while (curNode.parentNode) {
        elements.push(curNode.parentNode)
        curNode = curNode.parentNode
    }

    const selectorParts = selector.split(' ').reverse()

    if (!matchChild(selectorParts[0], element)) {
        return false
    }

    let matched = false
    let j = 1

    for (let i = 0, len = elements.length; i < len; i++) {
        if (matchChild(selectorParts[j], elements[i])) {
            j++
        }
    }

    return matched = j >= selectorParts.length

}
```

