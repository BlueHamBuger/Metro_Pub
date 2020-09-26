// Array 拓展方法
Array.prototype.remove = function(value) {
    let i = this.indexOf(value)
    if (i == -1) return false
    for (; i < this.length - 1; i++) {
        this[i] = this[i + 1]
    }
    this.length--;
    return true
}
cc.misc.slerp = function(angle1, angle2, t) { // 从 角度1 以最小角度 旋转到 角度2
    angle1 = Math.angleTo360(angle1)
    angle2 = Math.angleTo360(angle2)
    if (Math.abs(angle1 - angle2) > 180) { // 超过了 180 度 则说明 不能直接 lerp
        if (angle1 > 180) { // 必有一个 大于 180
            return Math.angleTo360(angle1 * (1 - t) + t * (360 + angle2))
        } else {
            return Math.angleTo360((360 + angle1) * (1 - t) + t * angle2)
        }
    } else {
        return angle1 * (1 - t) + angle2 * t
    }
}

cc.Vec2.floor = function(vec2) {
    vec2.x = Math.floor(vec2.x)
    vec2.y = Math.floor(vec2.y)
    return vec2
}



cc.Material.getNewInstance = (mat, node) => {
    return cc.Material.getInstantiatedMaterial(mat, node)
}

cc.saveForBrowser = function(textToWrite, fileNameToSaveAs) {
    if (cc.sys.isBrowser) {
        let textFileAsBlob = new Blob([textToWrite], { type: 'application/json' });
        let downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        if (window.webkitURL != null) {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        } else {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
        }
        downloadLink.click();
    }
}

Math.angleTo360 = function(angle) { // 将角度 变化为 360度内的值
    angle -= Math.floor(angle / 360) * 360
    return angle
}

Math.raduis2Angle = function(radius) {
    return radius * 180 / Math.PI
}

Math.getMaxBit = function(num) {
    num = num >>> 0
    let mask2Int = window.GB_Mask2Int
    let power2s = Object.keys(mask2Int)
    if (num == 0) return -1 // num 为0
    for (let i = 1; i < power2s.length; i++) {
        if (num < power2s[i] >>> 0) {
            return i - 1
        }
    }
}

Math.randomNum = function(min, max) {
    let rand = Math.random()
    return min + Math.floor(rand * (max - min))

}

Math.getRandom = function(base, range, integer) { // 给与基本值和 变化区间得到一个随机的值
    let rand = (Math.random() - 0.5) * 2
    if (integer) { // 返回整数
        return Math.round(base + rand * range)
    } else { // 返回浮点数
        return base + rand * range
    }
}
Math._xorShift_seed = 121
Math.xorShift32 = function() { // TODO 配置化 abc 三个位移的大小 
    Math._xorShift_seed ^= Math._xorShift_seed << 13;
    Math._xorShift_seed ^= Math._xorShift_seed >> 17;
    Math._xorShift_seed ^= Math._xorShift_seed << 5;
    return Math._xorShift_seed;
}
Math._xorShift_list = function() {
    let a = []
    for (let i = 0; i < 200; i++) {
        a.push(Math.xorShift32()) // 长度为200的随机数表
    }
    return a
}()
Math.mapInto = (num) => {
    return Math._xorShift_list[Math.abs(num) % Math._xorShift_list.length]
}

Math.getCloset2Pow = (num) => {
    var pow2 = 1
    for (let i = 0; i < 32; i++) {
        if (num < pow2) {
            return pow2
        }
        pow2 <<= 1
    }
}




cc.Color.getBrightColor = function(num) {
    //let rand_result = Math.xorShift32(num)
    //获取亮色
    let bit8 = (1 << 8) - 1
    let h = (num & bit8) / 255
    num >>= 8
    let s = (num & bit8) / 255 * 0.2 + 0.8
    num >>= 8
    let v = (num & bit8) / 255 * 0.1 + 0.9
    var color = new cc.Color()
    color.fromHSV(h, s, v)
    return color
}

cc.Color.multiply = (ca, cb) => {
    return new cc.Color(ca.r * cb.r / 255, ca.g * cb.g / 255, ca.b * cb.b / 255, ca.a * cb.a / 255)
}
cc.Texture2D._2dcanvas = function() {
    var canvas = document.createElement("canvas")
    var context = canvas.getContext("2d")
    return { canvas: canvas, context: context }
}()
cc.Texture2D.getIMGData = function(spriteFrame) {
    var canvas = cc.Texture2D._2dcanvas.canvas
    var context = cc.Texture2D._2dcanvas.context
    var texture = spriteFrame.getTexture()
        //var spriteRect = spriteFrame.getRect()
    canvas.width = texture.width
    canvas.height = texture.height
        //context.drawImage(texture.getHtmlElementObj(), spriteRect.x, spriteRect.y, spriteRect.width, spriteRect.height, 0, 0, spriteRect.width, spriteRect.height)
    context.drawImage(texture.getHtmlElementObj(), 0, 0, texture.width, texture.height)

    return context.getImageData(0, 0, texture.width, texture.height)

    //context.getImageData(0, 0, spriteRect.width, spriteRect.height).data
}



window.GB_Mask2Int = function() {
    let a = {}
    let z = (0x1) >>> 0
    for (let i = 0; i < 32; i++) {
        a[z << i] = i
    }
    return a
}()