import { AppStatus } from '../config'
import { apps } from './apps'

export function registerApplication(app) {
    //注册时app的activeRule如果是一个匹配路径，仍会被转成function
    if (typeof app.activeRule === 'string') {
        const path = app.activeRule
        app.activeRule = (location = window.location) => location.pathname === path
    }

    app.status = AppStatus.BEFORE_BOOTSTRAP
    apps.push(app)
}