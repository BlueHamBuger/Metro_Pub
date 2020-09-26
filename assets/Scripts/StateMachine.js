var StateMachine = cc.Class({
    name: "StateMachine",
    statics: {
        genFuncs: function(States) {
            let a = { onState: [], onStateEnter: [], onStateExit: [] }
            let states = Object.keys(States)
            for (let i = 0; i < states.length; i++) {
                let state = states[i]
                a.onState.push("on" + state)
                a.onStateEnter.push("on" + state + "Enter")
                a.onStateExit.push("on" + state + "Exit")
            }
            return a
        }
    },
    __ctor__(stateFuncs, entity) {
        this.state_bufffer = null // state 是在一帧内的确定的下一帧的状态 使用缓冲模式
        this.state = null // state 为当前的真实的状态
        this.for_state = null // 前一个状态
        this.entity = entity
            // 属性定义
        this.onState = []
        this.onStateEnter = []
        this.onStateExit = []
        stateFuncs.onState.forEach(func => {
            this.onState.push(entity.__proto__[func])
        });
        stateFuncs.onStateEnter.forEach(func => {
            this.onStateEnter.push(entity.__proto__[func])
        });
        stateFuncs.onStateExit.forEach(func => {
            this.onStateExit.push(entity.__proto__[func])
        });
    },
    reset(state) {
        this.for_state = null
        this.state_bufffer = state
        this.state = state
    },
    setState(state) {
        this.state_bufffer = state
    },
    getState() {
        return this.state
    },
    update(dt) {
        if (this.state_bufffer == null && this.state == null) return
        if (this.state_bufffer != this.state) {
            this.callFunc(this.onStateExit[this.state])
            this.callFunc(this.onStateEnter[this.state_bufffer])
            this.for_state = this.state
            this.state = this.state_bufffer
        }
        this.callFunc(this.onState[this.state], [dt])
    },
    callFunc(func, args) {
        if (func == null) {
            return null
        } else {
            if (args != null)
                return func.call(this.entity, ...args)
            else
                return func.call(this.entity)
        }
    }


})