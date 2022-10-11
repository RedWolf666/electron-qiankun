import bootstrapApp from '../lifecycle/bootstrap'
import mountApp from '../lifecycle/mount'
import unMountApp from '../lifecycle/unmount'
import {AppStatus } from '../config'

export const apps = []

export async function loadApps() {
	// 先卸载所有失活的子应用
    const toUnMountApp = getAppsWithStatus(AppStatus.MOUNTED)
    await Promise.all(toUnMountApp.map(unMountApp))
    
    // 初始化所有刚注册的子应用
    const toLoadApp = getAppsWithStatus(AppStatus.BEFORE_BOOTSTRAP)
    await Promise.all(toLoadApp.map(bootstrapApp))

    const toMountApp = [
        ...getAppsWithStatus(AppStatus.BOOTSTRAPPED),
        ...getAppsWithStatus(AppStatus.UNMOUNTED),
    ]
    // 加载所有符合条件的子应用
    await toMountApp.map(mountApp)
}

function getAppsWithStatus(status) {
    const result = []
    apps.forEach(app => {
        // tobootstrap or tomount
        if (isActive(app) && app.status === status) {
            switch (app.status) {
                case AppStatus.BEFORE_BOOTSTRAP:
                case AppStatus.BOOTSTRAPPED:
                case AppStatus.UNMOUNTED:
                    result.push(app)
                    break
            }
        } else if (app.status === AppStatus.MOUNTED && status === AppStatus.MOUNTED) {
            // tounmount
            result.push(app)
        }
    })

    return result
}

function isActive(app) {
    return typeof app.activeRule === 'function' && app.activeRule(window.location)
}