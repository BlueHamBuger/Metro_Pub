var MetroExit = cc.Class({
    extends: require("MetroEntity"),
    properties: {
        score: {
            get() {
                return this._score
            },
            set(value) {
                this._score = value
                console.log("score:" + this._score);
            }
        },

    },
    ctor() {
        this._score = 0
    },
    onTouch() {
        this.node.setScale(this.default_scale.mul(1.2))
    },
    onTouchEnd() {
        this.node.setScale(this.default_scale)
    },

    unuse: function() {
        this._super()
    },
    reuse: function(cellindex, scale) { // 重用函数  
        this._super(cellindex, scale)
    },
    onPopUpdate(tween, delta, line) {
        if (line != null)
            delta = -line.updatePop(-delta) // 线路的增加量为 相反数
        this.addScore(delta, line)
        return delta
    },
    getWaitNumber(line) {
        return line.cur_pop
    },




    addScore(pop, line) { //  根据人流 和 线路信息 来计算分数
        // 如果 人流来自 人流的 自动位移 则 line 为 null
        // 返回 计算后的 分数
        this.score += pop
        return this.score
    }
})