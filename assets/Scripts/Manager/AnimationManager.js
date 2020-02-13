cc.Class({
    extends: require('BaseManager'),
    statics: {
        // Tween Helper 用于解决 cc.tween  不能不同的target 之间使用的问题
        Parallel() {
            let tween_num = arguments.length - 1
            let call_back = arguments[arguments.length - 1] // 最后一个参数为 回调参数
            var count_func = function() {
                tween_num--;
                if (tween_num == 0) {
                    call_back()
                }
            }

            for (var i = 0; i < arguments.length - 1; i++) {
                arguments[i].call(count_func).start()
            }

        }

    },
})