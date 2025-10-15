<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />
<xsl:import href="../banshee/pagination.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<table class="table table-condensed table-striped">
<thead>
<tr><th>Adventure</th><th>Players</th></tr>
</thead>
<tbody>
<xsl:for-each select="adventures/adventure">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="title" /></td>
<td><xsl:value-of select="players" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/vault" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>Here you assign player characters to your adventure. The players of those characters will not be notified about this, so you have to inform them about it yourself.</p>
<p>Players need to have an account to your join your adventure. For that, you have two options. <a href="/vault/user">Create them yourself</a> or let your players create their own accounts with an <a href="/vault/invite">invite code</a>.</p>
<p>If one of your players created an account without an invitation code, (s)he will end up with a Dungeon Master account in his/her own group. <a href="/contact">Send me a message</a> with your username and the player's username and I will move the player's account to your group.</p>
<p>Before you can add characters to your adventure, your players have to create them first. The rule system for those characters needs to match the rule system of your adventure.</p>
<p>When you add one or more characters to your adventure, all character icons (including the ones already present on a map) will be placed around the yellow 'Player start' marker on each map.</p>
<p>A player's character can only be active in one adventure at a time.</p>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<h2><xsl:value-of select="adventure/title" /></h2>
<form action="/{/output/page}" method="post">
<input type="hidden" name="adventure_id" value="{adventure/@id}" />
<div class="row">
<xsl:for-each select="characters/user">
<div class="col-xs-12 col-sm-6 col-md-4">
<div class="panel panel-default">
<div class="panel-heading"><xsl:value-of select="@name" /></div>
<div class="panel-body">
<xsl:for-each select="character">
<div><xsl:if test="@sheet!=''"><span class="sheet">(<a href="{@sheet}" target="_blank">sheet</a>)</span></xsl:if><input type="checkbox" name="characters[]" value="{@id}"><xsl:if test="@checked='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input><xsl:value-of select="." /></div>
</xsl:for-each>
</div>
</div>
</div>
</xsl:for-each>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Select players" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="adventure/@id">
</xsl:if>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/players.png" class="title_icon" />
<h1>Player assignment</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
