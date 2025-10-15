<?php
	class vault_story_controller extends cauldron_controller {
		private function show_overview() {
			if ($this->adventures_pulldown_init() == false) {
				return;
			}

			if (($characters = $this->model->get_characters($this->model->active_adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($story = $this->model->get_story($this->model->active_adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($npcs = $this->model->get_npcs($this->model->active_adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($objects = $this->model->get_objects($this->model->active_adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($events = $this->model->get_events($this->model->active_adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($encounters = $this->model->get_encounters($this->model->active_adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($custom_dice = $this->model->get_custom_dice($this->user->id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_css("banshee/font-awesome.css");
			$this->view->add_css("includes/spells.css");
			$this->view->add_css("includes/dice_roll.css");

			$this->view->add_javascript("banshee/jquery.mark.js");
			$this->view->add_javascript("includes/library.js");
			$this->view->add_javascript("rule_systems/spells.js");
			$this->view->add_javascript("includes/dice_roll.js");
			$this->view->add_javascript("vault/story.js");

			$this->view->open_tag("overview");

			$this->adventures_pulldown_show();

			$message = new \Banshee\message($story["story"]);
			$this->view->add_tag("story", $message->unescaped_output());

			/* Characters
			 */
			$this->view->open_tag("characters");
			foreach ($characters as $character) {
				$this->view->record($character, "character");
			}
			$this->view->close_tag();

			/* NPCs
			 */
			$this->view->open_tag("npcs");
			foreach ($npcs as $npc) {
				if ($npc["cr"] != "") {
					$npc["cr"] = "CR ".$npc["cr"];
				}

				$message = new \Banshee\message($npc["description"]);
				$npc["description"] = $message->unescaped_output();

				$this->view->record($npc, "npc");
			}
			$this->view->close_tag();

			/* Objects
			 */
			$this->view->open_tag("objects");
			foreach ($objects as $object) {
				$message = new \Banshee\message($object["description"]);
				$object["description"] = $message->unescaped_output();

				$this->view->record($object, "object");
			}
			$this->view->close_tag();

			/* Events
			 */
			$this->view->open_tag("events");
			foreach ($events as $event) {
				$message = new \Banshee\message($event["description"]);
				$event["description"] = $message->unescaped_output();

				$this->view->record($event, "event");
			}
			$this->view->close_tag();

			/* Encounters
			 */
			foreach ($encounters as $e => $encounter) {
				$encounters[$e]["total_xp"] = 0;
				foreach ($encounter["monsters"] as $m => $monster) {
					$xp = CR_to_XP[$monster["cr"]];
					$encounters[$e]["monsters"][$m]["xp"] = $xp;

					$xp *= (int)$monster["count"];
					$encounters[$e]["monsters"][$m]["total_xp"] = $xp;

					$encounters[$e]["total_xp"] += $xp;
				}
			}

			$this->view->open_tag("encounters");
			foreach ($encounters as $encounter) {
				$this->view->record($encounter, "encounter", array(), true);
			}
			$this->view->close_tag();

			/* Custom dice
			 */
			$this->view->open_tag("custom_dice");
			foreach ($custom_dice as $dice) {
				$this->view->record($dice, "dice");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		/* Add CR levels
		 */
		private function add_cr_levels() {
			$this->view->add_javascript("vault/story_encounter.js");

			$crs = array_keys(CR_to_XP);
			array_unshift($crs, "");

			$this->view->open_tag("challenge_rating");
			foreach ($crs as $cr) {
				$this->view->add_tag("cr", $cr);
			}
			$this->view->close_tag();
		}

		/* Show story form
		 */
		private function show_story_form($story) {
			$this->view->title .= " - ".$story["title"];

			$this->view->open_tag("edit_story");
			$this->view->record($story, "adventure");
			$this->view->close_tag();
		}

		/* Show NPC form
		 */
		private function show_npc_form($npc) {
			$this->view->title .= " - Non-Player Character";

			$this->add_cr_levels();

			$this->view->open_tag("edit_npc");
			$this->view->record($npc, "npc");
			$this->view->close_tag();
		}

		/* Show object form
		 */
		private function show_object_form($object) {
			$this->view->title .= " - Object or location";

			$this->view->open_tag("edit_object");
			$this->view->record($object, "object");
			$this->view->close_tag();
		}

		/* Show event form
		 */
		private function show_event_form($event) {
			$this->view->title .= " - Event";

			$this->view->open_tag("edit_event");
			$this->view->record($event, "event");
			$this->view->close_tag();
		}

		/* Show encounter form
		 */
		private function show_encounter_form($encounter) {
			$this->view->title .= " - Encounter";

			$this->add_cr_levels();

			$this->view->open_tag("edit_encounter");
			$this->view->record($encounter, "encounter", array(), true);
			$this->view->close_tag();
		}

		/* Handle AJAX request
		 */
		private function handle_ajax_request() {
			$this->model->save_order($_POST["adventure_id"], $_POST["type"], $_POST["order"]);
		}

		/* Execute
		 */
		public function execute() {
			if ($this->page->ajax_request) {
				$this->handle_ajax_request();
				return;
			}

			$this->view->title = "Story writing";

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($this->adventures_pulldown_changed()) {
					/* Change adventure
					 */
					$this->show_overview();
				} else if ($_POST["submit_button"] == "Save story") {
					if ($this->model->save_story($_POST) == false) {
						$this->show_story_form($_POST);
					} else {
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Save NPC") {
					/* Save NPC
					 */
					if ($this->model->save_npc_okay($_POST) == false) {
						$this->show_npc_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create NPC
						 */
						if ($this->model->create_npc($_POST) === false) {
							$this->view->add_message("Error creating NPC.");
							$this->show_npc_form($_POST);
						} else {
							$this->user->log_action("story npc %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update NPC
						 */
						if ($this->model->update_npc($_POST) === false) {
							$this->view->add_message("Error updating NPC.");
							$this->show_npc_form($_POST);
						} else {
							$this->user->log_action("story npc %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete NPC") {
					/* Delete NPC
					 */
					if ($this->model->delete_npc_okay($_POST) == false) {
						$this->show_npc_form($_POST);
					} else if ($this->model->delete_npc($_POST["id"]) === false) {
						$this->view->add_message("Error deleting NPC.");
						$this->show_npc_form($_POST);
					} else {
						$this->user->log_action("story npc %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Save object") {
					/* Save object
					 */
					if ($this->model->save_object_okay($_POST) == false) {
						$this->show_object_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create object
						 */
						if ($this->model->create_object($_POST) === false) {
							$this->view->add_message("Error creating object.");
							$this->show_object_form($_POST);
						} else {
							$this->user->log_action("story object %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update object
						 */
						if ($this->model->update_object($_POST) === false) {
							$this->view->add_message("Error updating object.");
							$this->show_object_form($_POST);
						} else {
							$this->user->log_action("story object %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete object") {
					/* Delete object
					 */
					if ($this->model->delete_object_okay($_POST) == false) {
						$this->show_object_form($_POST);
					} else if ($this->model->delete_object($_POST["id"]) === false) {
						$this->view->add_message("Error deleting object.");
						$this->show_object_form($_POST);
					} else {
						$this->user->log_action("story object %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Save event") {
					/* Save Event
					 */
					if ($this->model->save_Event_okay($_POST) == false) {
						$this->show_Event_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create Event
						 */
						if ($this->model->create_Event($_POST) === false) {
							$this->view->add_message("Error creating Event.");
							$this->show_event_form($_POST);
						} else {
							$this->user->log_action("story event %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update Event
						 */
						if ($this->model->update_event($_POST) === false) {
							$this->view->add_message("Error updating Event.");
							$this->show_event_form($_POST);
						} else {
							$this->user->log_action("story event %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete event") {
					/* Delete Event
					 */
					if ($this->model->delete_event_okay($_POST) == false) {
						$this->show_event_form($_POST);
					} else if ($this->model->delete_event($_POST["id"]) === false) {
						$this->view->add_message("Error deleting Event.");
						$this->show_event_form($_POST);
					} else {
						$this->user->log_action("story event %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Save encounter") {
					/* Save Encounter
					 */
					if (isset($_POST["monsters"]) == false) {
						$_POST["monsters"] = array();
					} else foreach ($_POST["monsters"] as $m => $monster) {
						if (implode("", $monster) == "") {
							unset($_POST["monsters"][$m]);
						}
					}

					if ($this->model->save_Encounter_okay($_POST) == false) {
						$this->show_Encounter_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create Encounter
						 */
						if ($this->model->create_Encounter($_POST) === false) {
							$this->view->add_message("Error creating Encounter.");
							$this->show_encounter_form($_POST);
						} else {
							$this->user->log_action("story encounter %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update Encounter
						 */
						if ($this->model->update_encounter($_POST) === false) {
							$this->view->add_message("Error updating Encounter.");
							$this->show_encounter_form($_POST);
						} else {
							$this->user->log_action("story encounter %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete encounter") {
					/* Delete Encounter
					 */
					if ($this->model->delete_encounter_okay($_POST) == false) {
						$this->show_encounter_form($_POST);
					} else if ($this->model->delete_encounter($_POST["id"]) === false) {
						$this->view->add_message("Error deleting Encounter.");
						$this->show_encounter_form($_POST);
					} else {
						$this->user->log_action("story encounter %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "edit")) {
				/* Main story
				 */
				$adventure_id = $this->model->active_adventure_id;
				if (($story = $this->model->get_story($adventure_id)) == false) {
					$this->view->add_tag("result", "Adventure not found.");
				} else {
					$this->show_story_form($story);
				}
			} else if ($this->page->parameter_value(0, "npc")) {
				if ($this->page->parameter_value(1, "new")) {
					/* New NPC
					 */
					$npc = array();
					$this->show_npc_form($npc);
				} else if ($this->page->parameter_numeric(1)) {
					/* Edit NPC
					 */
					if (($npc = $this->model->get_npc($this->page->parameters[1])) == false) {
						$this->view->add_tag("result", "NPC not found.");
					} else {
						$this->show_npc_form($npc);
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "object")) {
				if ($this->page->parameter_value(1, "new")) {
					/* New object
					 */
					$object = array();
					$this->show_object_form($object);
				} else if ($this->page->parameter_numeric(1)) {
					/* Edit object
					 */
					if (($object = $this->model->get_object($this->page->parameters[1])) == false) {
						$this->view->add_tag("result", "Object not found.");
					} else {
						$this->show_object_form($object);
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "event")) {
				if ($this->page->parameter_value(1, "new")) {
					/* New event
					 */
					$event = array();
					$this->show_event_form($event);
				} else if ($this->page->parameter_numeric(1)) {
					/* Edit event
					 */
					if (($event = $this->model->get_event($this->page->parameters[1])) == false) {
						$this->view->add_tag("result", "Event not found.");
					} else {
						$this->show_event_form($event);
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "encounter")) {
				if ($this->page->parameter_value(1, "new")) {
					/* New encounter
					 */
					$encounter = array();
					$this->show_encounter_form($encounter);
				} else if ($this->page->parameter_numeric(1)) {
					/* Edit encounter
					 */
					if (($encounter = $this->model->get_encounter($this->page->parameters[1])) == false) {
						$this->view->add_tag("result", "Encounter not found.");
					} else {
						$this->show_encounter_form($encounter);
					}
				} else {
					$this->show_overview();
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
