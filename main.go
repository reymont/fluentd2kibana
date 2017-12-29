package main

//import (
//	_ "github.com/reymont/fluentd2kibana/routers"
//	"github.com/astaxie/beego"
//)
//
//func main() {
//	beego.Run()
//}

import (
	"fmt"
	"github.com/astaxie/beego/orm"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/fluentd2kibana/models"
)

func init() {
	orm.RegisterDriver("mysql", orm.DRMySQL)

	orm.RegisterDataBase("default", "mysql", "root:root@/orm_test?charset=utf8")
}

func main() {
	o := orm.NewOrm()
	o.Using("default") // 默认使用 default，你可以指定为其他数据库

	profile := new(Profile)
	profile.Age = 30

	user := new(User)
	user.Profile = profile
	user.Name = "slene"

	fmt.Println(o.Insert(profile))
	fmt.Println(o.Insert(user))
}

