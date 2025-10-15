<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />

<!--
//
//  Show template
//
//-->
<xsl:template match="show">
<label for="invitation_code">Invitation code:</label>
<input type="text" id="invitation_code" name="invitation_code" value="{invitation_code}" readonly="readonly" class="form-control" />

<div class="btn-group change">
<a href="/{/output/page}/edit" class="btn btn-default">Set code</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>Share this code with your players, so they can use it to join your group while creating an account. Make sure that the code cannot easily be guessed by other people. Remove the code when you no longer need players to join your group.</p>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />

<form method="post" action="/{/output/page}">
<div class="form-group">
<label for="invitation_code">Invitation code:</label>
<div class="input-group">
<span class="input-group-addon"><xsl:value-of select="organisation_id" />-</span>
<input type="text" id="invitation_code" name="invitation_code" value="{invitation_code}" maxlength="50" class="form-control" />
</div>
</div>

<div class="btn-group edit">
<input type="submit" name="submit_button" value="Save code" class="btn btn-default" />
<input type="button" id="random_code" value="Random code" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/invite.png" class="title_icon" />
<h1>Invitation code</h1>
<xsl:apply-templates select="show" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
