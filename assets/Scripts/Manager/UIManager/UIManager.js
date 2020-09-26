cc.Class({
    extends: require("BaseManager"),
    properties: {
        score: {
            type: cc.Label,
            default: null
        },
    },
    setScore(score) {
        this.score.string = this.score.string.split(":")[0] + ":" + Math.ceil(score)
    },
    onBackPress() {
        //cc.director.loadScene("Main");

        this.stopAllActionsRecur(this.node)
        this.gameMng.exit()
        cc.game.restart()
    },
    stopAllActionsRecur(node){
        node.stopAllActions()
        node.children.forEach(child => {
            this.stopAllActionsRecur(child)
        });
    }

})