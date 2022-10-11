'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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

async function bootstrapApp(app) {    
    const { bootstrap, mount, unmount } = await app.loadApp();

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

    let result = app.bootstrap(app.props);
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

function mountApp(app){
    app.status = AppStatus.BEFORE_MOUNT;

    let result = app.mount(app.props);
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

function unMountApp(app){
    app.status = AppStatus.BEFORE_UNMOUNT;

    let result = app.unmount(app.props);
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
    const toUnMountApp = getAppsWithStatus(AppStatus.MOUNTED);
    await Promise.all(toUnMountApp.map(unMountApp));
    
    const toLoadApp = getAppsWithStatus(AppStatus.BEFORE_BOOTSTRAP);
    await Promise.all(toLoadApp.map(bootstrapApp));

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
        alert('hashchange');
        loadApps();
    }, true);
}

function registerApplication(app) {
    if (typeof app.activeRule === 'string') {
        const path = app.activeRule;
        app.activeRule = (location = window.location) => location.pathname === path;
    }

    app.status = AppStatus.BEFORE_BOOTSTRAP;
    apps.push(app);
}

let isStarted = false;
function start() {
    if (!isStarted) {
        isStarted = true;
        loadApps();
    }
}

let aaa ='test';

overwriteEventsAndHistory();

exports.aaa = aaa;
exports.registerApplication = registerApplication;
exports.start = start;
