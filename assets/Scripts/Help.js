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

Math.angleTo360 = function(angle) { // 将角度 变化为 360度内的值
    angle -= Math.floor(angle / 360) * 360
    return angle
}