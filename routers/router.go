package routers

import (
	"github.com/reymont/fluentd2kibana/controllers"
	"github.com/astaxie/beego"
)

func init() {
    beego.Router("/", &controllers.MainController{})
}
