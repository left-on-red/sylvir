let _;

(function() {    
    function underscore(context, args) {
        if (args.length == 0) {
            let elements = toArr(context.children);
            populate(context, elements);
            return elements;
        }

        else if (args.length == 1) {
            if (typeof args[0] == 'string') {
                let elements = context.querySelectorAll(args[0]);
                elements = toArr(elements);
                elements.first = function() { return this.length > 0 ? this[0] : null }
                elements.last = function() { return this.length > 0 ? this[this.length - 1] : null }
                if (elements.length == 1) { elements = elements[0] }
                populate(context, elements);
                if (elements.length == 0) { return null }
                return elements;
            }
        }
    }

    let toArr = function(iterator) {
        let arr = [];
        if (iterator.forEach) { iterator.forEach(function(v, k) { arr.push(v) }) }
        else { for (let i = 0; i < iterator.length; i++) { arr.push(iterator[i]) } }
        return arr;
    }

    let populate = function(context, element) {
        let methods = ['css', 'class'];
        if (element instanceof Array) {
            for (let e = 0; e < element.length; e++) { populate(context, element[e]) }
            for (let m = 0; m < methods.length; m++) {
                element[methods[m]] = function(...args) {
                    let arr = [];
                    for (let i = 0; i < element.length; i++) { arr.push(element[i][methods[m]](...args)) }
                    return arr;
                }
            }
        }

        else if (element instanceof HTMLElement) {
            element.css = function(...args) {
                if (args[0] && typeof args[0] == 'object') {
                    for (let p in args[0]) {
                        let prop = p.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase() });
                        if (typeof args[0][p] == 'string') { this.style[prop] = args[0][p] }
                        else { this.style[prop] = args[0][p].toString() }
                    }
                }

                else if ((args[0] && typeof args[0] == 'string') && args[1]) {
                    args[0] = args[0].replace(/-([a-z])/g, function (g) { return g[1].toUpperCase() });
                    this.style[args[0]] = args[1].toString();
                }

                else if (args[0]) {
                    args[0] = args[0].replace(/-([a-z])/g, function (g) { return g[1].toUpperCase() });
                    return this.style[args[0]];
                }
            }

            element.before = function(...elements) {
                for (let e = 0; e < elements.length; e++) {
                    if (elements[e] instanceof HTMLElement) { element.insertBefore(elements[e], element) }
                    else if (typeof elements[e] == 'string' && /<\/?[a-z][\s\S]*>/i.test(elements[e])) { element.insertAdjacentHTML('beforebegin', elements[e]) }
                    else if (typeof elements[e] == 'string') { element.insertAdjacentText('beforebegin', elements[e]) }
                }
            }

            element.begin = function(...elements) {
                for (let e = 0; e < elements.length; e++) {
                    if (elements[e] instanceof HTMLElement) { element.prepend(elements[e]) }
                    else if (typeof elements[e] == 'string' && /<\/?[a-z][\s\S]*>/i.test(elements[e])) { element.insertAdjacentHTML('afterbegin', elements[e]) }
                    else if (typeof elements[e] == 'string') { element.insertAdjacentText('afterbegin', elements[e]) }
                }
            }

            element.end = function(...elements) {
                for (let e = 0; e < elements.length; e++) {
                    if (elements[e] instanceof HTMLElement) { element.append(elements[e]) }
                    else if (typeof elements[e] == 'string' && /<\/?[a-z][\s\S]*>/i.test(elements[e])) { element.insertAdjacentHTML('beforeend', elements[e]) }
                    else if (typeof elements[e] == 'string') { element.insertAdjacentText('beforeend', elements[e]) }
                }
            }

            element.after = function(...elements) {
                for (let e = 0; e < elements.length; e++) {
                    if (elements[e] instanceof HTMLElement) { element.insertBefore(elements[e], element.nextSibling) }
                    else if (typeof elements[e] == 'string' && /<\/?[a-z][\s\S]*>/i.test(elements[e])) { element.insertAdjacentHTML('afterend', elements[e]) }
                    else if (typeof elements[e] == 'string') { element.insertAdjacentText('afterend', elements[e]) }
                }
            }

            element.class = function(str) {
                if (!str) {
                    let list = [];
                    element.classList.forEach(function(value) { list.push(value) });
                    return list;
                }

                if (str.startsWith('+')) {
                    str = str.slice(1);
                    element.classList.add(str);
                }

                else if (str.startsWith('-')) {
                    str = str.slice(1);
                    element.classList.remove(str);
                }
            }

            element.set = function(key, value) { element.setAttribute(key, value) }
            element.empty = function() { element.innerHTML = '' }
            element.on = function(event, callback) { element.addEventListener(event, callback) }
            element._ = function(...args) { return underscore(element, args) }
        }
    }

    _ = function(...args) { return underscore(document, args) }

    _.new = function(str) {
        if (/<\/?[a-z][\s\S]*>/i.test(str)) {
            let div = document.createElement('div');
            div.innerHTML = str;
            let arr = [];
            for (let c = 0; c < div.children.length; c++) { arr.push(div.children[c]) }
            for (let a = 0; a < arr.length; a++) { populate(arr[a], arr[a]) }
            if (arr.length == 1) { arr = arr[0] }
            return arr;
        }
    
        else {
            str = str.split(' ').join('');
            let div = document.createElement('div');
            div.innerHTML = `<${str}></${str}>`;
            let child = div.children[0];
            populate(child, child);
            return child;
        }
    }
    
    _.request = {
        get: async function(url, json) {
            return new Promise(function(resolve, reject) {
                let http = new XMLHttpRequest();
                http.onreadystatechange = function() { if (http.readyState == 4 && http.status == 200) { resolve(json ? JSON.parse(http.responseText) : http.responseText) } }
                http.open('GET', url, true);
                http.send(null);
            });
        }
    }
})();