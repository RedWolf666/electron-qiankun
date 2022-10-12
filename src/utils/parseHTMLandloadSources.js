import { createElement, removeNode } from './dom'

const urlReg = /^http(s)?:\/\//
function isCorrectURL(url = '') {
    return true
    return urlReg.test(url)
}

export default function parseHTMLandLoadSources(app) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        const pageEntry = app.pageEntry
        if (!isCorrectURL(pageEntry)) {
            return reject(Error(`${pageEntry} is not a valid url`))
        }
    
        let html = ''
        try {
            html = await loadSourceText(pageEntry) // load html
            console.log('htmlhtmlhtmlhtml:',html)
        } catch (error) {
            reject(error)
        }
        
        const domparser = new DOMParser()
        const doc = domparser.parseFromString(html, 'text/html')
        const { scripts, styles } = extractScriptsAndStyles(doc, app)
        // 提取了 script style 后剩下的 body 部分的 html 内容
        app.pageBody = doc.body.innerHTML

        let isStylesDone = false, isScriptsDone = false
        // 加载 style script 的内容
        Promise.all(loadStyles(styles))
        .then(data => {
            isStylesDone = true
            addStyles(data)
            if (isScriptsDone && isStylesDone) resolve()
        })
        .catch(err => reject(err))

        Promise.all(loadScripts(scripts))
        .then(data => {
            isScriptsDone = true
            executeScripts(data)
            if (isScriptsDone && isStylesDone) resolve()
        })
        .catch(err => reject(err))
    })
}

export const globalLoadedURLs = []
function extractScriptsAndStyles(node, app) {
    if (!node.children.length) return { scripts: [], styles: [] }

    let styles = []
    let scripts = []
    for (const child of Array.from(node.children)) {
        const isGlobal = Boolean(child.getAttribute('global'))
        const tagName = child.tagName
        
        if (tagName === 'STYLE') {
            removeNode(child)
            styles.push({
                isGlobal,
                value: child.textContent || '',
            })
        } else if (tagName === 'SCRIPT') {
            removeNode(child)
            const src = child.getAttribute('src') || ''
            if (app.loadedURLs.includes(src) || globalLoadedURLs.includes(src)) {
                continue
            }
            
            const config = {
                isGlobal,
                type: child.getAttribute('type'),
                value: child.textContent || '',
            }

            if (src) {
                config.url = src
                if (isGlobal) {
                    globalLoadedURLs.push(src)
                } else {
                    app.loadedURLs.push(src)
                }
            }

            scripts.push(config)
        } else if (tagName === 'LINK') {
            removeNode(child)
            const href = child.getAttribute('href') || ''
            if (app.loadedURLs.includes(href) || globalLoadedURLs.includes(href)) {
                continue
            }

            if (child.getAttribute('rel') === 'stylesheet' && href) {
                styles.push({
                    url: href,
                    isGlobal,
                    value: '',
                })

                if (isGlobal) {
                    globalLoadedURLs.push(href)
                } else {
                    app.loadedURLs.push(href)
                }
            }
        } else {
            const result = extractScriptsAndStyles(child, app)
            scripts = scripts.concat(result.scripts)
            styles = styles.concat(result.styles)
        }
    }

    return { scripts, styles }
}

export function loadSourceText(url) {
    console.log('urlurlurlurl:',url)
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.onload = (res) => {
            resolve(res.target.response)
        }

        xhr.onerror = reject
        xhr.onabort = reject
        xhr.open('get', url)
        xhr.send()
    })
}

const head = document.head
function loadStyles(styles) {
    if (!styles.length) return []

    return styles.map(item => {
        if (item.isGlobal) {
            if (item.url) {
                const link = createElement('link', {
                    global: item.isGlobal,
                    href: item.url,
                    rel: 'stylesheet',
                })

                head.appendChild(link)
            } else {
                const style = createElement('style', {
                    global: item.isGlobal,
                    type: 'text/css',
                    textContent: item.value,
                })

                head.appendChild(style)
            }

            return
        }

        if (item.url) return loadSourceText(item.url)
        return Promise.resolve(item.value)
    })
    .filter(Boolean)
}

function loadScripts(scripts) {
    if (!scripts.length) return []

    return scripts.map(item => {
        const type = item.type || 'text/javascript'
        if (item.isGlobal) {
            const script = createElement('script', { 
                type,
                global: item.isGlobal,
            })

            if (item.url) {
                script.setAttribute('src', item.url)
            } else {
                script.textContent = item.value
            }

            head.appendChild(script)
            return
        }

        if (item.url) return loadSourceText(item.url)
        return Promise.resolve(item.value)
    })
    .filter(Boolean)
}

export function executeScripts(scripts) {
    try {
        scripts.forEach(code => {
            // eslint-disable-next-line no-new-func
            new Function('window', code).call(window, window)
        })
    } catch (error) {
        throw error
    }
}

export function addStyles(styles) {
    styles.forEach(item => {
        if (typeof item === 'string') {
            const node = createElement('style', {
                type: 'text/css',
                textContent: item,
            })

            head.appendChild(node)
        } else {
            head.appendChild(item)
        }
    })
}