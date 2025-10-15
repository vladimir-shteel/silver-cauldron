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
<xsl:import href="../banshee/main.xslt" />
<xsl:import href="../banshee/pagination.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<form action="/{/output/page}" method="post" class="search">
<div class="input-group">
<input type="text" id="search" name="search" value="{@search}" placeholder="Search" class="form-control" />
<span class="input-group-btn"><input type="button" value="X" class="btn btn-default" onClick="javascript:$('input#search').val(''); $(this).parent().parent().parent().submit();" /></span>
</div>
<input type="hidden" name="submit_button" value="search" />
</form>

<table class="table table-striped table-hover table-condensed">
<thead>
<tr>
<th class="username"><a href="?order=username">Username</a></th>
<th class="id"><a href="?order=id">ID</a></th>
<th class="name"><a href="?order=fullname">Name</a></th>
<th class="email"><a href="?order=email">E-mail address</a></th>
<th class="status"><a href="?order=status">Account status</a></th>
</tr>
</thead>
<tbody>
<xsl:for-each select="users/user">
<tr class="disabled">
<xsl:if test="/output/user/@admin='yes' or @admin='no'">
<xsl:attribute name="class">click</xsl:attribute>
<xsl:attribute name="onClick">javascript:document.location='/<xsl:value-of select="/output/page" />/<xsl:value-of select="@id" />'</xsl:attribute>
</xsl:if>
<td><xsl:value-of select="username" /></td>
<td><xsl:value-of select="@id" /></td>
<td><xsl:value-of select="fullname" /></td>
<td><xsl:value-of select="email" /></td>
<td><xsl:value-of select="status" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="right">
<xsl:apply-templates select="pagination" />
</div>
<div class="left btn-group">
<a href="/{/output/page}/new" class="btn btn-default">New user</a>
<a href="/vault" class="btn btn-default">Back</a>
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
<xsl:if test="user/@id">
<input type="hidden" name="id" value="{user/@id}" />
</xsl:if>
<div class="form-group">
<label for="username">Username:</label>
<input type="text" id="username" name="username" value="{user/username}" class="form-control" />
</div>
<div class="form-group">
<label for="password">Password:</label>
<span class="generate"><input type="checkbox" name="generate" id="generate" onClick="javascript:password_field()">
<xsl:if test="user/generate='on'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if>
</input>Auto-generate password and send it to the user via e-mail.</span>
<input type="password" id="password" name="password" class="form-control">
<xsl:if test="user/generate='on'"><xsl:attribute name="disabled">disabled</xsl:attribute></xsl:if>
</input>
</div>
<div class="form-group">
<label for="email">E-mail address:</label>
<input type="text" id="email" name="email" value="{user/email}" class="form-control" />
</div>
<div class="form-group">
<label for="status">Account status:</label>
<select id="status" name="status" class="form-control">
<xsl:if test="user/@id=/output/user/@id">
<xsl:attribute name="readonly">readonly</xsl:attribute>
</xsl:if>
<xsl:for-each select="status/status">
<option value="{@id}">
<xsl:if test="@id=../../user/status">
<xsl:attribute name="selected">selected</xsl:attribute>
</xsl:if>
<xsl:value-of select="." />
</option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="fullname">Full name:</label>
<input type="text" id="fullname" name="fullname" value="{user/fullname}" class="form-control" />
</div>
<xsl:if test="organisations">
<div class="form-group">
<label for="organisation">Organisation:</label>
<select id="organisation" name="organisation_id" class="form-control">
<xsl:for-each select="organisations/organisation">
<option value="{@id}">
<xsl:if test="@id=../../user/organisation_id">
<xsl:attribute name="selected">selected</xsl:attribute>
</xsl:if>
<xsl:value-of select="." />
</option>
</xsl:for-each>
</select>
</div>
</xsl:if>
<xsl:if test="@authenticator='yes'">
<div class="form-group">
<label for="secret">Authenticator secret:</label> [<span class="info" onClick="javascript:$('#as_dialog').dialog()">?</span>]
<div class="input-group">
	<input type="text" id="secret" name="authenticator_secret" value="{user/authenticator_secret}" class="form-control" style="text-transform:uppercase" />
	<span class="input-group-btn"><input type="button" value="Generate" class="btn btn-default" onClick="javascript:set_authenticator_code()" /></span>
</div>
</div>
</xsl:if>
<div class="form-group">
<label for="roles">Roles:</label>
<xsl:for-each select="roles/role">
<div><input type="checkbox" name="roles[{@id}]" value="{@id}" class="role">
<xsl:if test="@enabled='no'">
<xsl:attribute name="disabled">disabled</xsl:attribute>
</xsl:if>
<xsl:if test="@checked='yes'">
<xsl:attribute name="checked">checked</xsl:attribute>
</xsl:if>
</input><xsl:value-of select="." />
<xsl:if test="@enabled='no'">
<input type="hidden" name="roles[{@id}]" value="{@id}" />
</xsl:if>
</div>
</xsl:for-each>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save user" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="user/@id and not(user/@id=/output/user/@id)">
<input type="submit" name="submit_button" value="Delete user" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>

<input type="hidden" id="password_hashed" name="password_hashed" value="no" />
</form>

<div id="as_dialog" title="Authenticator app">
<p>This option requires the use of an authenticator app (RFC 6238) on your mobile phone.</p>
<p>The app must use BASE32 characters, SHA1 and a 30 second time interval to generate a 6 digit code.</p>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/users.png" class="title_icon" />
<h1>User accounts</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
