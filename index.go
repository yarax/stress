package main
 
import (
    "fmt"
    "io/ioutil"
    "net/http"
    "os"
    "time"
    )
var total int = 0
func req(i int) {
    response, err := http.Get("http://google.com/")
    if err != nil {
        fmt.Printf("%s", err)
        os.Exit(1)
    } else {
        //defer response.Body.Close()
        _, err := ioutil.ReadAll(response.Body)
        if err != nil {
            fmt.Printf("%s", err)
            os.Exit(1)
        }
        //fmt.Printf("%d\n", i)
    } 
    total++
}


func main() {
    for i := 0; i < 200; i++ {
        go req(i)
    }

    ticker := time.NewTicker(time.Millisecond * 1000)
    go func() {
        for t := range ticker.C {
            fmt.Println("RPS ", t, total)
            total = 0
        }
    }()
    time.Sleep(time.Second * 10)
    ticker.Stop()
    fmt.Println("Ticker stopped")

    var input string
    fmt.Scanln(&input)

}
