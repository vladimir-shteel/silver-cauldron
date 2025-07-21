<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class session_controller extends Banshee\controller {
		private function show_sessions() {
			if (($sessions = $this->model->get_sessions()) === false) {
				$this->view->add_tag("result", "Error fetching session information.");
				return;
			}

			$this->view->open_tag("sessions", array("logout" => LOGOUT_MODULE));
			foreach ($sessions as $session) {
				$owner = show_boolean($session["session_id"] == $this->user->session->id);
				$session["expire"] = date_string("d F Y, H:i:s", $session["expire"]);
				$session["bind_to_ip"] = show_boolean($session["bind_to_ip"]);
				$this->view->record($session, "session", array("owner" => $owner));
			}
			$this->view->close_tag();
		}

		private function show_session_form($session) {
			$this->view->open_tag("edit");
			$this->view->record($session, "session");
			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Session manager";

			if ($this->user->logged_in == false) {
				$this->view->add_tag("result", "The session manager should not be accessible for non-authenticated visitors!");
				return;
			}

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Update session") {
					/* Update session
				 	 */
					if ($this->model->session_okay($_POST) == false) {
						$this->show_session_form($_POST);
					} else if ($this->model->update_session($_POST) == false) {
						$this->view->add_tag("result", "Error while updating session.");
					} else {
						$this->show_sessions();
					}
				} else if ($_POST["submit_button"] == "Delete session") {
					/* Delete session
					 */
					if ($this->model->delete_session($_POST["id"]) == false) {
						$this->view->add_tag("result", "Error while deleting session.");
					} else {
						$this->show_sessions();
					}
				} else {
					$this->show_sessions();
				}
			} else if (isset($this->page->parameters[0])) {
				/* Edit session
				 */
				if (($session = $this->model->get_session($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "Session not found.");
				} else {
					$this->show_session_form($session);
				}
			} else {
				/* Show overview
				 */
				$this->show_sessions();
			}
		}
	}
?>
