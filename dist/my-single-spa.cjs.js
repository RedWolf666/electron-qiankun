'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function createElement(tag, attrs) {
    const node = document.createElement(tag);
    attrs && Object.keys(attrs).forEach(key => {
        node.setAttribute(key, attrs[key]);
    });

    return node
}

function removeNode(node) {
    node.parentNode?.removeChild(node);
}

const urlReg = /^http(s)?:\/\//;
function isCorrectURL(url = '') {
    return urlReg.test(url)
}

function parseHTMLandLoadSources(app) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        const pageEntry = app.pageEntry;
        if (!isCorrectURL(pageEntry)) {
            return reject(Error(`${pageEntry} is not a valid url`))
        }
    
        let html = '';
        try {
            html = await loadSourceText(pageEntry); // load html
        } catch (error) {
            reject(error);
        }
        
        const domparser = new DOMParser();
        const doc = domparser.parseFromString(html, 'text/html');
        const { scripts, styles } = extractScriptsAndStyles(doc, app);
        
        // 提取了 script style 后剩下的 body 部分的 html 内容
        app.pageBody = doc.body.innerHTML;

        let isStylesDone = false, isScriptsDone = false;
        // 加载 style script 的内容
        Promise.all(loadStyles(styles))
        .then(data => {
            isStylesDone = true;
            addStyles(data);
            if (isScriptsDone && isStylesDone) resolve();
        })
        .catch(err => reject(err));

        Promise.all(loadScripts(scripts))
        .then(data => {
            isScriptsDone = true;
            executeScripts(data);
            if (isScriptsDone && isStylesDone) resolve();
        })
        .catch(err => reject(err));
    })
}

const globalLoadedURLs = [];
function extractScriptsAndStyles(node, app) {
    if (!node.children.length) return { scripts: [], styles: [] }

    let styles = [];
    let scripts = [];
    for (const child of Array.from(node.children)) {
        const isGlobal = Boolean(child.getAttribute('global'));
        const tagName = child.tagName;
        
        if (tagName === 'STYLE') {
            removeNode(child);
            styles.push({
                isGlobal,
                value: child.textContent || '',
            });
        } else if (tagName === 'SCRIPT') {
            removeNode(child);
            const src = child.getAttribute('src') || '';
            if (app.loadedURLs.includes(src) || globalLoadedURLs.includes(src)) {
                continue
            }
            
            const config = {
                isGlobal,
                type: child.getAttribute('type'),
                value: child.textContent || '',
            };

            if (src) {
                config.url = src;
                if (isGlobal) {
                    globalLoadedURLs.push(src);
                } else {
                    app.loadedURLs.push(src);
                }
            }

            scripts.push(config);
        } else if (tagName === 'LINK') {
            removeNode(child);
            const href = child.getAttribute('href') || '';
            if (app.loadedURLs.includes(href) || globalLoadedURLs.includes(href)) {
                continue
            }

            if (child.getAttribute('rel') === 'stylesheet' && href) {
                styles.push({
                    url: href,
                    isGlobal,
                    value: '',
                });

                if (isGlobal) {
                    globalLoadedURLs.push(href);
                } else {
                    app.loadedURLs.push(href);
                }
            }
        } else {
            const result = extractScriptsAndStyles(child, app);
            scripts = scripts.concat(result.scripts);
            styles = styles.concat(result.styles);
        }
    }

    return { scripts, styles }
}

function loadSourceText(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = (res) => {
            resolve(res.target.response);
        };

        xhr.onerror = reject;
        xhr.onabort = reject;
        xhr.open('get', url);
        xhr.send();
    })
}

const head = document.head;
function loadStyles(styles) {
    if (!styles.length) return []

    return styles.map(item => {
        if (item.isGlobal) {
            if (item.url) {
                const link = createElement('link', {
                    global: item.isGlobal,
                    href: item.url,
                    rel: 'stylesheet',
                });

                head.appendChild(link);
            } else {
                const style = createElement('style', {
                    global: item.isGlobal,
                    type: 'text/css',
                    textContent: item.value,
                });

                head.appendChild(style);
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
        const type = item.type || 'text/javascript';
        if (item.isGlobal) {
            const script = createElement('script', { 
                type,
                global: item.isGlobal,
            });

            if (item.url) {
                script.setAttribute('src', item.url);
            } else {
                script.textContent = item.value;
            }

            head.appendChild(script);
            return
        }

        if (item.url) return loadSourceText(item.url)
        return Promise.resolve(item.value)
    })
    .filter(Boolean)
}

function executeScripts(scripts) {
    try {
        scripts.forEach(code => {
            // eslint-disable-next-line no-new-func
            // new Function('window', code).call(window, window)
        });
    } catch (error) {
        throw error
    }
}

function addStyles(styles) {
    styles.forEach(item => {
        if (typeof item === 'string') {
            const node = createElement('style', {
                type: 'text/css',
                textContent: item,
            });

            head.appendChild(node);
        } else {
            head.appendChild(item);
        }
    });
}

function isPromise(fn) {
    if ((typeof fn === 'object' || typeof fn === 'function') && typeof fn.then === 'function') {
        return true
    }
}

let AppStatus = {
    BEFORE_BOOTSTRAP : 'BEFORE_BOOTSTRAP',
    BOOTSTRAPPED : 'BOOTSTRAPPED',
    BEFORE_MOUNT : 'BEFORE_MOUNT',
    MOUNTED : 'MOUNTED',
    BEFORE_UNMOUNT : 'BEFORE_UNMOUNT',
    UNMOUNTED : 'UNMOUNTED',
    BOOTSTRAP_ERROR : 'BOOTSTRAP_ERROR',
    MOUNT_ERROR : 'MOUNT_ERROR',
    UNMOUNT_ERROR : 'UNMOUNT_ERROR',
};

const window$1 = {};

async function bootstrapApp(app) {
    try {
        // 加载 js css
        await parseHTMLandLoadSources(app);
    } catch (error) {
        throw error
    }
    
    const { bootstrap, mount, unmount } = await getLifeCycleFuncs(app.name);

    validateLifeCycleFunc('bootstrap', bootstrap);
    validateLifeCycleFunc('mount', mount);
    validateLifeCycleFunc('unmount', unmount);

    app.bootstrap = bootstrap;
    app.mount = mount;
    app.unmount = unmount;
    
    try {
        app.props = await getProps(app.props);
    } catch (err) {
        app.status = AppStatus.BOOTSTRAP_ERROR;
        throw err
    }
    
    let result = app.bootstrap({ props: app.props, container: app.container });
    if (!isPromise(result)) {
        result = Promise.resolve(result);
    }
    
    return result
    .then(() => {
        app.status = AppStatus.BOOTSTRAPPED;
    })
    .catch((err) => {
        app.status = AppStatus.BOOTSTRAP_ERROR;
        throw err
    })
}

async function getProps(props) {
    if (typeof props === 'function') return props()
    if (typeof props === 'object') return props
    return {}
}

function validateLifeCycleFunc(name, fn) {
    if (typeof fn !== 'function') {
        throw Error(`The "${name}" must be a function`)
    }
}

async function getLifeCycleFuncs(name) {
    const result = window$1[`mini-single-spa-${name}`];
    if (typeof result === 'function') {
        return result()
    }

    if (typeof result === 'object') {
        return result
    }

    throw Error(`The micro app must inject the lifecycle("bootstrap" "mount" "unmount") into window['mini-single-spa-${name}']`)
}

function mountApp(app) {
    app.status = AppStatus.BEFORE_MOUNT;
    app.container.innerHTML = app.pageBody;
    
    let result = app.mount({ props: app.props, container: app.container });
    if (!isPromise(result)) {
        result = Promise.resolve(result);
    }
    
    return result
    .then(() => {
        app.status = AppStatus.MOUNTED;
    })
    .catch((err) => {
        app.status = AppStatus.MOUNT_ERROR;
        throw err
    })
}

function unMountApp(app) {
    app.status = AppStatus.BEFORE_UNMOUNT;

    let result = app.unmount({ props: app.props, container: app.container });
    if (!isPromise(result)) {
        result = Promise.resolve(result);
    }
    
    return result
    .then(() => {
        app.status = AppStatus.UNMOUNTED;
    })
    .catch((err) => {
        app.status = AppStatus.UNMOUNT_ERROR;
        throw err
    })
}

const apps = [];

async function loadApps() {
    const toLoadApp = getAppsWithStatus(AppStatus.BEFORE_BOOTSTRAP);
    const toUnMountApp = getAppsWithStatus(AppStatus.MOUNTED);
    
    const loadPromise = toLoadApp.map(bootstrapApp);
    const unMountPromise = toUnMountApp.map(unMountApp);
    await Promise.all([...loadPromise, ...unMountPromise]);
    
    const toMountApp = [
        ...getAppsWithStatus(AppStatus.BOOTSTRAPPED),
        ...getAppsWithStatus(AppStatus.UNMOUNTED),
    ];
    
    await toMountApp.map(mountApp);
}

function getAppsWithStatus(status) {
    const result = [];
    apps.forEach(app => {
        // tobootstrap or tomount
        if (isActive(app) && app.status === status) {
            switch (app.status) {
                case AppStatus.BEFORE_BOOTSTRAP:
                case AppStatus.BOOTSTRAPPED:
                case AppStatus.UNMOUNTED:
                    result.push(app);
                    break
            }
        } else if (app.status === AppStatus.MOUNTED && status === AppStatus.MOUNTED) {
            // tounmount
            result.push(app);
        }
    });

    return result
}

function isActive(app) {
    return typeof app.activeRule === 'function' && app.activeRule(window.location)
}

const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

function overwriteEventsAndHistory() {
    window.history.pushState = function (state, title, url) {
        const result = originalPushState.call(this, state, title, url);
        loadApps();
        return result
    };
    
    window.history.replaceState = function (state, title, url) {
        const result = originalReplaceState.call(this, state, title, url);
        loadApps();
        return result
    };
    
    window.addEventListener('popstate', () => {
        loadApps();
    }, true);
    
    window.addEventListener('hashchange', () => {
        loadApps();
    }, true);
}

function registerApplication(app) {
    if (typeof app.activeRule === 'string') {
        const path = app.activeRule;
        app.activeRule = (location = window.location) => location.pathname === path;
    }

    app.pageBody = '';
    app.loadedURLs = [];
    app.status = AppStatus.BEFORE_BOOTSTRAP;
    apps.push(app);
}

let isStarted = false;
function start() {
    if (!isStarted) {
        isStarted = true;
        try {
            loadApps();
        } catch (error) {
            throw error
        }
    }
}

overwriteEventsAndHistory();

exports.registerApplication = registerApplication;
exports.start = start;
