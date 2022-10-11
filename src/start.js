import { loadApps } from './application/apps'

let isStarted = false
export function start() {
    if (!isStarted) {
        isStarted = true
        loadApps()
    }
}

export function isStart() {
    return isStarted
}