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
<table class="table table-condensed table-striped table-hover">
<thead>
<tr><th>Name</th><th>Type</th></tr>
</thead>
<tbody>
<xsl:for-each select="dices/dice">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="name" /></td>
<td>d<xsl:value-of select="sides" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New dice</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>Besides the numbed dice like a d6 or a d20, some game systems use custom dice. They have words or symbols on the sides. Use this module to define those custom dice. When running an adventure, open the Dice roll window to use the custom dice. Custom dice are availeble to you and all your players.</p>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<xsl:if test="dice/@id">
<input type="hidden" name="id" value="{dice/@id}" />
</xsl:if>

<div class="form-group">
<label for="YYY">Name:</label>
<input type="text" id="name" name="name" value="{dice/name}" maxlength="25" class="form-control" />
</div>
<div class="form-group">
<label>Sides:</label>
<div id="sides">
<xsl:for-each select="dice/sides">
<div class="input-group">
<span class="input-group-addon"><xsl:value-of select="position()" /></span>
<input type="text" name="sides[]" value="{.}" class="form-control" />
</div>
</xsl:for-each>
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save dice" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="dice/@id">
<input type="submit" name="submit_button" value="Delete dice" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
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
<img src="/images/icons/dice.png" class="title_icon" />
<h1>Custom dice</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
