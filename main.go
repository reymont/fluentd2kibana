package main

import (
	_ "github.com/reymont/fluentd2kibana/routers"
	"github.com/astaxie/beego"
)

func main() {
	beego.Run()
}

