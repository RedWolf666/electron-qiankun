import { AppStatus } from '../config'
import { apps } from './apps'

export default function registerApplication(app) {
    if (typeof app.activeRule === 'string') {
        const path = app.activeRule
        app.activeRule = (location = window.location) => location.hash === path
    }

    app.pageBody = ''
    app.loadedURLs = []
    app.status = AppStatus.BEFORE_BOOTSTRAP
    apps.push(app)
}