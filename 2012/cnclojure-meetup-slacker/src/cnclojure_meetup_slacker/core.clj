(ns cnclojure-meetup-slacker.core
  (:use [clojure.java.browse])
  (:import [org.webbitserver
            WebServers
            WebSocketHandler
            WebSocketConnection])
  (:import [org.webbitserver.handler
            StaticFileHandler]))

(def control (atom nil))
(def player (atom nil))

(def ws-handler
  (reify WebSocketHandler
    (onOpen [this conn])
    (onClose [this conn])
    (^void onMessage [this ^WebSocketConnection conn ^String msg]
      (case msg
        "player#" (do
                    (reset! player conn)
                    (println "slides connected.")
                    (.send conn "connected"))
        "control#" (do
                     (reset! control conn)
                     (println "controller connected")
                     (.send conn "connected"))
        
        "next" (.send @player "next")
        "prev" (.send @player "prev")))
    (^void onMessage [this ^WebSocketConnection conn ^bytes msg])
    (onPing [this con msg])
    (onPong [this con msg])))

(defn -main [& args]
  (let [static-path "./static"]
    (-> (WebServers/createWebServer 8080)
      (.add "/control" ws-handler)
      (.add (StaticFileHandler. static-path))
      (.start)))
  (if-not (> (count args) 0)
    (browse-url "http://127.0.0.1:8080/")))


