<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="sessions">
<table class="table table-striped table-hover table-condensed">
<thead>
<tr><th>IP address</th><th>Expire date</th><th>IP binded</th><th>Name</th></tr>
</thead>
<tbody>
<xsl:for-each select="session">
<tr onClick="javascript:document.location='/session/{@id}'"><xsl:if test="@owner='yes'"><xsl:attribute name="class">warning</xsl:attribute></xsl:if>
<td><xsl:value-of select="ip_address" /></td>
<td><xsl:value-of select="expire" /></td>
<td><xsl:value-of select="bind_to_ip" /></td>
<td><xsl:value-of select="name" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group">
<a href="/{@logout}" class="btn btn-default">Logout</a>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/session" method="post">
<input type="hidden" name="id" value="{session/@id}" />

<div class="form-group">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{session/name}" class="form-control" />
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Update session" class="btn btn-default" />
<a href="/session" class="btn btn-default">Cancel</a>
<input type="submit" name="submit_button" value="Delete session" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1>Session Manager</h1>
<xsl:apply-templates select="sessions" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
