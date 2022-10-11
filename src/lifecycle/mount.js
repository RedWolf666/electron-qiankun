import { isPromise } from '../utils/utils'
import { AppStatus } from '../config'

export default function mountApp(app){
    app.status = AppStatus.BEFORE_MOUNT

    let result = app.mount(app.props)
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