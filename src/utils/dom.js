export function createElement(tag, attrs) {
    const node = document.createElement(tag)
    attrs && Object.keys(attrs).forEach(key => {
        node.setAttribute(key, attrs[key])
    })

    return node
}

export function removeNode(node) {
    var _node$parentNode;
(_node$parentNode = node.parentNode) === null || _node$parentNode === void 0 ? void 0 : _node$parentNode.removeChild(node);
}