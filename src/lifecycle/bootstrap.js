import { isPromise } from '../utils/utils'
import { AppStatus } from '../config'

export default async function bootstrapApp(app) {    
    const { bootstrap, mount, unmount } = await app.loadApp()

    validateLifeCycleFunc('bootstrap', bootstrap)
    validateLifeCycleFunc('mount', mount)
    validateLifeCycleFunc('unmount', unmount)

    app.bootstrap = bootstrap
    app.mount = mount
    app.unmount = unmount

    try {
        app.props = await getProps(app.props)
    } catch (err) {
        app.status = AppStatus.BOOTSTRAP_ERROR
        throw err
    }

    let result = app.bootstrap(app.props)
    if (!isPromise(result)) {
        result = Promise.resolve(result)
    }
    
    return result
    .then(() => {
        app.status = AppStatus.BOOTSTRAPPED
    })
    .catch((err) => {
        app.status = AppStatus.BOOTSTRAP_ERROR
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