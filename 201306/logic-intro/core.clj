(ns logic.core
  (:refer-clojure :exclude [==])
  (:use [clojure.core.logic]
;        [clojure.core.logic.fd :as fd]
        ))

;;; a biblical family database
(defrel father p1 p2)
;; father(terach,abrahm).
(fact father 'Terach 'Abraham)
(fact father 'Terach 'Nachor)
(fact father 'Terach 'Haran)
(fact father 'Abraham 'Issac)
(fact father 'Haran 'Lot)
(fact father 'Haran 'Milcah)
(fact father 'Haran 'Yiscah)

(defrel male p)
;; male(terach).
(fact male 'Terach)
(fact male 'Abraham)
(fact male 'Nachor)
(fact male 'Haran)
(fact male 'Issac)
(fact male 'Lot)

(defrel female p)
;; female(sarah).
(fact female 'Sarah)
(fact female 'Milcah)
(fact female 'Yiscah)

(defrel mother p1 p2)
;; mother(sarah,issac).
(fact mother 'Sarah 'Issac)

;; father(abraham,issac)?
(run* [x]
      (father 'Abraham 'Issac))

(run* [_]
      (father 'Abraham 'Issac))

;; father(abraham,haran)?
(run* [_]
      (father 'Abraham 'Haran))

;; father(abraham,X)?
(run* [x]
      (father 'Abraham x))

;; father(X,haran)?
(run* [x]
      (father x 'Haran))

;; father(haran,X), male(X)?
(run* [x]
      (father 'Haran x)
      (male x))

;; father(terach,X), father(X,Y)?
(run* [x y]
      (father 'Terach x)
      (father x y))

;; son(X,Y) <- father(Y,X), male(X).
(defn son
  [x y]
  (fresh [_]
         (father y x)
         (male x)))

;; son(lot,haran)?
(run* [_]
      (son 'Lot 'Haran))

;; son(X,haran)?
(run* [x]
      (son x 'Haran))

;; son(haran,X)?
(run* [x]
      (son 'Haran x))

;; similarly
;; daughter(X,Y) <- father(Y,X), female(X).
(defn daughter
  [x y]
  (fresh [_]
         (father y x)
         (female x)))

;; grandfather(X,Y) <- father(X,Z), father(Z,Y).
(defn grandfather
  [x y]
  (fresh [z]
         (father x z)
         (father z y)))

;;; consider both maternal and paternal sides
;; parent(X,Y) <- father(X,Y).
;; parent(X,Y) <- mother(X,Y).
(defn parent
  [x y]
  (fresh [_]
         (conde
          [(father x y)]
          [(mother x y)])))

;; son(X,Y) <- parent(Y,X), male(X).
(defn son
  [x y]
  (fresh [_]
         (parent y x)
         (male x)))

;; daughter(X,Y) <- parent(Y,X), female(X).
(defn daughter
  [x y]
  (fresh [_]
         (parent y x)
         (female x)))

;; grandparent(X,Y) <- parent(X,Z), parent(Z,Y).
(defn grandparent
  [x y]
  (fresh [z]
         (parent x z)
         (parent z y)))

(run* [x]
      (grandparent 'Terach x))

(run* [x]
      (grandparent x 'Milcah))

;; recursive rules
;; ancestor(Ancestor, Descendant) <-
;;  parent(Ancestor, Descendant).
;; ancestor(Ancestor, Descendant) <-
;;  parent(Ancestor, Person), ancestor(Person, Descendant).
(defn ancestor
  [anc desc]
  (conde
   [(parent anc desc)]
   [(fresh [p]
           (parent anc p)
           (ancestor p desc))]))

(run* [x]
      (ancestor x 'Yiscah))

;; fresh is exist in miniKanren
(defn anyo
  [g]
  (conde
   [g]
   [(anyo g)]))

(run 5 [q]
     (conde
      [(anyo (== false q))]
      [(== true q)]))

(run 5 [q]
     (conde
      [(== false q)]
      [(== true q)]))

(run 10 [q]
     (anyo
      (conde
       [(== 1 q)]
       [(== 2 q)]
       [(== 3 q)])))

(def alwayso (anyo (== false false)))

;; (run 1 [x]
;;      (== true x)
;;      alwayso
;;      (== false x))

;; (run 5 [x]
;;      (conde
;;       [(== true x)]
;;       [(== false x)])
;;      alwayso
;;      (== false x))

;; non-relational operators: project conda condu onceo copy-termo

;; won't work
(run* [q]
      (fresh [x]
             (== 5 x)
             (== (* x x) q)))

(run* [q]
      (fresh [x]
             (== 5 x)
             (project [x]
                      (== (* x x) q))))

;; won't work, either: project is non-relational
(run* [q]
      (fresh [x]
             (project [x]
                      (== (* x x) q))
             (== 5 x)))

;; conda and condu work like cut in Prolog
;; sequential: non-relational
;; conda commits to the first clause when it succeeds
(run* [x]
      (conda
       [(== 'Olive x)]
       [(== 'Oil x)]))

(run* [x]
      (conda
       [(== 'Virgin x) (== true false)]
       [(== 'Olive x)]
       [(== 'Oil x)]))

;; condu: like conda, but the test goal can succeed at most once
(run* [q]
      (condu
       [(== true false)]
       [alwayso])
      (== true q))

;; onceo: at most one single answer
(run* [q]
      (onceo alwayso))

;; when some conde clauses loop indefinitely, other conde clauses still can contribute to the values returned
;; run 4 will not terminate
(run 3 [q]
     (let [nevero (anyo (== false true))]
       (conde
        [(== 1 q)]
        [nevero]
        [(conde
          [(== 2 q)]
          [nevero]
          [(== 3 q)])])))

;; (run 1 [q]
;;      (fresh [x y z]
;;             (== x z)
;;             (== 3 y)))

;; (run 1 [y]
;;      (fresh [x z]
;;             (== x z)
;;             (== 3 y)))

;; (run 1 [x]
;;      (== 4 3))

;; (run 5 [q]
;;      (fresh [x y z]
;;             (conde
;;              [(== [x y z x] q)]
;;              [(== [z y x z] q)])))

;; (run* [_]
;;       (resto [2 3] [3]))

;; wildcards
;; run n
;; ==
;; !=
;; matche
;; list destructuring
;; implicit variables
;; conde
;; conso
;; resto
;; membero
;; appendo
