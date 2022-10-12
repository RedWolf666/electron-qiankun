import { isPromise } from '../utils/utils'
import { AppStatus } from '../config'

export default function mountApp(app) {
    app.status = AppStatus.BEFORE_MOUNT
    app.container.innerHTML = app.pageBody
    
    let result = app.mount({ props: app.props, container: app.container })
    if (!isPromise(result)) {
        result = Promise.resolve(result)
    }
    
    return result
    .then(() => {
        app.status = AppStatus.MOUNTED
    })
    .catch((err) => {
        app.status = AppStatus.MOUNT_ERROR
        throw err
    })
}