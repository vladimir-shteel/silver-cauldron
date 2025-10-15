<?php
	class rs_controller extends Banshee\controller {
		public function execute() {
			if ($this->page->ajax_request == false) {
				$this->view->disable();
				return;
			}

			if (isset($this->page->parameters[1]) == false) {
				$this->view->add_tag("error", 400);
				return;
			}

			$rs = $this->page->parameters[0]."_rule_system";
			
			if (class_exists($rs) == false) {
				$this->view->add_tag("error", 400);
				return;
			}

			if (($info = $this->db->entry("rule_systems", $this->page->parameters[0], "code")) == false) {
				$this->view->add_tag("error", 400);
				return false;
			}

			$rule_system = new $rs($this->db, $this->user, $this->view, $info);
			$method = strtolower($_SERVER["REQUEST_METHOD"])."_".$this->page->parameters[1];

			if (method_exists($rule_system, $method) == false) {
				$this->view->add_tag("error", 400);
				return;
			}

			$rule_system->$method();
		}
	}
?>
