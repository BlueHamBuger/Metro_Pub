var FSM = require("StateMachine")
var State = window.GB_StationState = {
    Normal: 0,
    Takein: 1, // 人流入
    Vanish: 2,
}
var MetroEntity = require("MetroEntity")
var MetroExit = cc.Class({
    extends: MetroEntity,
    properties: {
        score: {
            get() {
                return this._score
            },
            set(value) {
                this._score = value
                MetroEntity.MetroMng.gameMng.score = this._score

            }
        },

    },
    statics: {
        StateFunc: FSM.genFuncs(State)
    },
    ctor() {
        this._score = 0
        this.fsm = new FSM(MetroExit.StateFunc, this)
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
        this.anim.play("spawning")
    },
    onPopUpdate(tween, delta, line) {
        if (line != null)
            delta = -line.updatePop(-delta) // 线路的增加量为 相反数
        this.addScore(delta, line)
        return delta
    },
    getWaitNumber(line) {
        return line.car.cur_pop
    },
    addScore(pop, line) { //  根据人流 和 线路信息 来计算分数
        // 如果 人流来自 人流的 自动位移 则 line 为 null
        // 返回 计算后的 分数
        this.score += pop * (1 + (line.passed_stations - 1) * 0.5) * line.extra_bonus //TODO 倍数设置
        return this.score
    },
    // 状态
    onNormalEnter() {

    },
    onVanishEnter() {},
    onTakein() {},

    // Animation
    onFinished(type, state) { // animation 回调
        switch (state.name) {
            case "spawning":
                this.fsm.setState(State.Normal)
                break
        }
    },

})