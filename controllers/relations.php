<?php
	class relations_controller extends cauldron_controller {
		const ENTITY_COLORS = array(
			"white"  => "#ffffff",
			"grey"   => "#d0d0d0",
			"red"    => "#ffc0c0",
			"orange" => "#f0c880",
			"yellow" => "#ffffc0",
			"green"  => "#c0ffc0",
			"blue"   => "#c8c8ff",
			"purple" => "#e0a0f0");

		const CONNECTION_COLORS = array(
			"black"  => "#000000",
			"grey"   => "#b0b0b0",
			"red"    => "#ff0000",
			"green"  => "#00e000",
			"blue"   => "#0000ff");

		const CONNECTION_TYPES = array("solid", "dashed", "dotted");

		private function show_relations($adventure_id) {
			if (($entities = $this->model->get_entities($adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($connections = $this->model->get_connections($adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("webui/jquery-ui.js");
			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("relations.js");

			$this->view->open_tag("relations", array("adventure_id" => $adventure_id));

			$this->adventures_pulldown_show();

			$this->view->open_tag("entities");
			foreach ($entities as $entity) {
				unset($entity["organisation_id"]);
				$this->view->record($entity, "entity");
			}
			$this->view->close_tag();

			$this->view->open_tag("connections");
			foreach ($connections as $connection) {
				unset($connection["organisation_id"]);
				$this->view->record($connection, "connection");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_entity_form($entity) {
			$this->view->open_tag("edit_entity");

			$this->view->open_tag("colors");
			foreach (self::ENTITY_COLORS as $label => $rgb) {	
				$this->view->add_tag("color", $label, array("rgb" => $rgb));
			}
			$this->view->close_tag();

			$this->view->record($entity, "entity");

			$this->view->close_tag();
		}

		private function show_connection_form($connection) {
			if (($entities = $this->model->get_entities($connection["adventure_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($entities) < 2) {
				$this->view->add_tag("result", "You need at least two entities.");
				return;
			}

			$this->view->open_tag("edit_connection");

			$this->view->open_tag("entities");
			foreach ($entities as $entity) {
				unset($entity["organisation_id"]);
				$this->view->record($entity, "entity");
			}
			$this->view->close_tag();

			$this->view->open_tag("colors");
			foreach (self::CONNECTION_COLORS as $label => $rgb) {	
				$this->view->add_tag("color", $label, array("rgb" => $rgb));
			}
			$this->view->close_tag();

			$this->view->open_tag("types");
			foreach (self::CONNECTION_TYPES as $label) {	
				$this->view->add_tag("type", $label);
			}
			$this->view->close_tag();

			$this->view->record($connection, "connection");

			$this->view->close_tag();
		}

		public function execute() {
			if ($this->adventures_pulldown_init(true) == false) {
				return;
			}

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($this->adventures_pulldown_changed()) {
                    $this->show_relations($this->model->active_adventure_id);
				} else if ($this->page->ajax_request) {
					$this->model->move_entity($_POST);
				} else if ($_POST["submit_button"] == "Save entity") {
					/* Save entity
					 */
					if ($this->model->save_entity_okay($_POST) == false) {
						$this->show_entity_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create entity
						 */
						if (($adventure_id = $this->model->create_entity($_POST)) === false) {
							$this->view->add_message("Error creating entity.");
							$this->show_entity_form($_POST);
						} else {
							$this->user->log_action("relation entity %d created", $this->db->last_insert_id);
							$this->show_relations($adventure_id);
						}
					} else {
						/* Update entity
						 */
						if (($adventure_id = $this->model->update_entity($_POST)) === false) {
							$this->view->add_message("Error updating entity.");
							$this->show_entity_form($_POST);
						} else {
							$this->user->log_action("relation entity %d updated", $_POST["id"]);
							$this->show_relations($adventure_id);
						}
					}
				} else if ($_POST["submit_button"] == "Delete entity") {
					/* Delete entity
					 */
					if (($adventure_id = $this->model->delete_entity($_POST["id"])) === false) {
						$this->view->add_message("Error deleting entity.");
						$this->show_entity_form($_POST);
					} else {
						$this->user->log_action("relation entity %d deleted", $_POST["id"]);
						$this->show_relations($adventure_id);
					}
				} else if ($_POST["submit_button"] == "Save relation") {
					/* Save connection
					 */
					if ($this->model->save_connection_okay($_POST) == false) {
						$this->show_connection_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create connection
						 */
						if (($adventure_id = $this->model->create_connection($_POST)) === false) {
							$this->view->add_message("Error creating connection.");
							$this->show_connection_form($_POST);
						} else {
							$this->user->log_action("relation connection %d created", $this->db->last_insert_id);
							$this->show_relations($adventure_id);
						}
					} else {
						/* Update connection
						 */
						if (($adventure_id = $this->model->update_connection($_POST)) === false) {
							$this->view->add_message("Error updating connection.");
							$this->show_connection_form($_POST);
						} else {
							$this->user->log_action("relation connection %d updated", $_POST["id"]);
							$this->show_relations($adventure_id);
						}
					}
				} else if ($_POST["submit_button"] == "Delete relation") {
					/* Delete connection 
					 */
					if (($adventure_id = $this->model->delete_connection($_POST["id"])) === false) {
						$this->view->add_message("Error deleting connection.");
						$this->show_connection_form($_POST);
					} else {
						$this->user->log_action("relation connection %d deleted", $_POST["id"]);
						$this->show_relations($adventure_id);
					}
				} else {
					$this->show_relations($this->model->active_adventure_id);
				}
			} else if ($this->page->parameter_value(0, "new_entity") && $this->page->parameter_numeric(1)) {
				/* New entity
				 */
				$entity = array("adventure_id" => $this->page->parameters[1]);
				$this->show_entity_form($entity);
			} else if ($this->page->parameter_value(0, "new_connection") && $this->page->parameter_numeric(1)) {
				/* New connection
				 */
				$entity = array("adventure_id" => $this->page->parameters[1]);
				$this->show_connection_form($entity);
			} else if ($this->page->parameter_value(0, "edit_entity") && $this->page->parameter_numeric(1)) {
				/* Edit entity
				 */
				if (($entity = $this->model->get_entity($this->page->parameters[1])) == false) {
					$this->view->add_tag("result", "Entity not found.");
				} else {
					$this->show_entity_form($entity);
				}
			} else if ($this->page->parameter_value(0, "edit_connection") && $this->page->parameter_numeric(1)) {
				/* Edit connection
				 */
				if (($connection = $this->model->get_connection($this->page->parameters[1])) == false) {
					$this->view->add_tag("result", "Connection not found.");
				} else {
					$this->show_connection_form($connection);
				}
			} else {
				/* Show relations
				 */
				$this->show_relations($this->model->active_adventure_id);
			}
		}
	}
?>
