(defmacro export-symbol (name)
  `(defvar ,name (if (not (eq (typeof *symbol) undefined))
                     (*symbol) ,(string name))))

;; Internal flag when a definition is used instead of a change function.
(export-symbol *has-definition-key*)

;; Internal flag that is set when a change function is bound to its
;; parent object.
(export-symbol *is-bound-to-parent-key*)

;; Boolean flag to check whether a Node has already been processed.
(export-symbol *is-processed-key*)

;; This boolean flag is used for a DOM performance optimization,
;; `appendChild` is faster than `insertBefore`.
(export-symbol *is-marker-last-key*)

;; A marker is a superfluous node (empty text or comment) used as a reference
;; position for the DOM API.
(export-symbol *marker-key*)

;; Generic key for storing meta information.
(export-symbol *meta-key*)

;; This keeps the previously assigned values of keys on objects. It is set on
;; a bound object and valued by a memoized object that contains the same
;; keys as the bound object.
(export-symbol *memoized-object-key*)

;; Internally used to match cloned nodes.
(export-symbol *matched-node-key*)

;; Internally used to indicate what attribute to set.
(export-symbol *replace-attribute-key*)

;; This is a publicly exposed symbol used for indicating that an element
;; should be retained in the DOM tree after its value is unset.
(export-symbol *retain-element-key*)

;; Used for mapping a DOM Node to its preprocessed template.
(export-symbol *template-key*)
